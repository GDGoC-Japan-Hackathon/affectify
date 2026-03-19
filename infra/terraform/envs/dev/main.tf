locals {
  enabled_services = [
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "sqladmin.googleapis.com",
    "sts.googleapis.com",
  ]

  backend_service_account_id = "whitecoder-backend-dev"
  github_deployer_sa_id      = "whitecoder-github-deployer"
}

module "project_services" {
  source = "../../modules/project_services"

  project_id = var.project_id
  services   = local.enabled_services
}

module "artifact_registry" {
  source = "../../modules/artifact_registry"

  project_id    = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository_id

  depends_on = [module.project_services]
}

module "secret_manager" {
  source = "../../modules/secret_manager"

  project_id = var.project_id
  secret_ids = var.secret_ids
  # DB パスワードと Firebase Admin JSON の実体は Terraform 入力から Secret Manager へ流す。
  secret_versions = {
    "db-password"                = var.cloud_sql_user_password
    "firebase-admin-credentials" = var.firebase_admin_credentials_json
  }

  depends_on = [module.project_services]
}

module "cloud_sql" {
  source = "../../modules/cloud_sql"

  project_id    = var.project_id
  region        = var.region
  instance_name = var.cloud_sql_instance_name
  database_name = var.cloud_sql_database_name
  user_name     = var.cloud_sql_user_name
  user_password = var.cloud_sql_user_password
  tier          = var.cloud_sql_tier

  depends_on = [module.project_services]
}

resource "google_service_account" "backend" {
  account_id   = local.backend_service_account_id
  display_name = "WhiteCoder Backend (dev)"

  depends_on = [module.project_services]
}

resource "google_service_account" "github_deployer" {
  account_id   = local.github_deployer_sa_id
  display_name = "WhiteCoder GitHub Deployer"

  depends_on = [module.project_services]
}

resource "google_project_iam_member" "backend_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_storage_bucket" "variant_sources" {
  name                        = var.source_bucket_name
  project                     = var.project_id
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  depends_on = [module.project_services]
}

resource "google_storage_bucket_iam_member" "backend_variant_sources_admin" {
  bucket = google_storage_bucket.variant_sources.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.backend.email}"
}

module "github_wif" {
  source = "../../modules/github_wif"

  project_id                    = var.project_id
  project_number                = var.project_number
  github_owner                  = var.github_owner
  github_repository             = var.github_repository
  workload_identity_pool_id     = var.wif_pool_id
  workload_identity_provider_id = var.wif_provider_id
  service_account_email         = google_service_account.github_deployer.email

  depends_on = [module.project_services, google_service_account.github_deployer]
}

resource "google_project_iam_member" "github_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_project_iam_member" "github_artifact_registry_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_project_iam_member" "github_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

module "cloud_run" {
  source = "../../modules/cloud_run"

  project_id            = var.project_id
  region                = var.region
  service_name          = var.cloud_run_service_name
  service_account_email = google_service_account.backend.email
  image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository_id}/${var.backend_image_name}:${var.backend_image_tag}"
  # backend は Cloud SQL の Unix socket (/cloudsql/...) で接続する。
  cloud_sql_instances = [module.cloud_sql.instance_connection_name]
  secret_env = {
    DB_PASSWORD               = "db-password"
    FIREBASE_CREDENTIALS_JSON = "firebase-admin-credentials"
  }
  env = {
    DB_NAME                  = var.cloud_sql_database_name
    DB_USER                  = var.cloud_sql_user_name
    GCP_PROJECT_ID           = var.project_id
    GCP_REGION               = var.region
    GRAPH_BUILD_JOB_NAME     = var.graph_build_job_name
    INSTANCE_CONNECTION_NAME = module.cloud_sql.instance_connection_name
    FIREBASE_PROJECT_ID      = var.project_id
    REVIEW_JOB_NAME          = var.review_job_name
    SOURCE_BUCKET_NAME       = google_storage_bucket.variant_sources.name
  }

  depends_on = [
    module.project_services,
    module.artifact_registry,
    module.secret_manager,
    module.cloud_sql,
    google_service_account.backend,
  ]
}

module "graph_build_job" {
  source = "../../modules/cloud_run_job"

  project_id            = var.project_id
  region                = var.region
  job_name              = var.graph_build_job_name
  service_account_email = google_service_account.backend.email
  image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository_id}/${var.backend_image_name}:${var.backend_image_tag}"
  cloud_sql_instances   = [module.cloud_sql.instance_connection_name]
  command               = ["/app/worker"]
  args                  = ["graph-build"]
  secret_env = {
    DB_PASSWORD               = "db-password"
    FIREBASE_CREDENTIALS_JSON = "firebase-admin-credentials"
  }
  env = {
    DB_NAME                  = var.cloud_sql_database_name
    DB_USER                  = var.cloud_sql_user_name
    GCP_PROJECT_ID           = var.project_id
    GCP_REGION               = var.region
    INSTANCE_CONNECTION_NAME = module.cloud_sql.instance_connection_name
    FIREBASE_PROJECT_ID      = var.project_id
    SOURCE_BUCKET_NAME       = google_storage_bucket.variant_sources.name
  }

  depends_on = [
    module.project_services,
    module.artifact_registry,
    module.secret_manager,
    module.cloud_sql,
    google_service_account.backend,
    google_storage_bucket.variant_sources,
  ]
}

module "review_job" {
  source = "../../modules/cloud_run_job"

  project_id            = var.project_id
  region                = var.region
  job_name              = var.review_job_name
  service_account_email = google_service_account.backend.email
  image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository_id}/${var.backend_image_name}:${var.backend_image_tag}"
  cloud_sql_instances   = [module.cloud_sql.instance_connection_name]
  command               = ["/app/worker"]
  args                  = ["review"]
  secret_env = {
    DB_PASSWORD               = "db-password"
    FIREBASE_CREDENTIALS_JSON = "firebase-admin-credentials"
  }
  env = {
    DB_NAME                  = var.cloud_sql_database_name
    DB_USER                  = var.cloud_sql_user_name
    GCP_PROJECT_ID           = var.project_id
    GCP_REGION               = var.region
    INSTANCE_CONNECTION_NAME = module.cloud_sql.instance_connection_name
    FIREBASE_PROJECT_ID      = var.project_id
    SOURCE_BUCKET_NAME       = google_storage_bucket.variant_sources.name
  }

  depends_on = [
    module.project_services,
    module.artifact_registry,
    module.secret_manager,
    module.cloud_sql,
    google_service_account.backend,
    google_storage_bucket.variant_sources,
  ]
}

resource "google_cloud_run_v2_job_iam_member" "backend_run_graph_build_job" {
  project  = var.project_id
  location = var.region
  name     = module.graph_build_job.job_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_cloud_run_v2_job_iam_member" "backend_run_review_job" {
  project  = var.project_id
  location = var.region
  name     = module.review_job.job_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.backend.email}"
}
