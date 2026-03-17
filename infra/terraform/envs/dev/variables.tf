variable "project_id" {
  description = "GCP project id"
  type        = string
}

variable "project_number" {
  description = "GCP project number"
  type        = string
}

variable "region" {
  description = "Primary GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "artifact_registry_repository_id" {
  description = "Artifact Registry repository id for backend images"
  type        = string
  default     = "whitecoder-backend"
}

variable "backend_image_name" {
  description = "Artifact Registry 上の backend image 名"
  type        = string
  default     = "backend"
}

variable "backend_image_tag" {
  description = "Cloud Run が参照する backend image tag。git sha を推奨"
  type        = string
  default     = "dev"
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "whitecoder-backend"
}

variable "cloud_sql_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "whitecoder-postgres-dev"
}

variable "cloud_sql_database_name" {
  description = "Application database name"
  type        = string
  default     = "affectify"
}

variable "cloud_sql_user_name" {
  description = "Application database user name"
  type        = string
  default     = "whitecoder_app"
}

variable "cloud_sql_user_password" {
  description = "Application database user password"
  type        = string
  sensitive   = true
}

variable "firebase_admin_credentials_json" {
  description = "Firebase Admin SDK credentials JSON"
  type        = string
  sensitive   = true
}

variable "cloud_sql_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "github_owner" {
  description = "GitHub organization or user name"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
  default     = "affectify"
}

variable "wif_pool_id" {
  description = "Workload Identity Pool id"
  type        = string
  default     = "github-actions"
}

variable "wif_provider_id" {
  description = "Workload Identity Provider id"
  type        = string
  default     = "github-provider"
}

variable "secret_ids" {
  description = "Secret Manager secret ids managed by Terraform"
  type        = set(string)
  default = [
    "db-password",
    "firebase-admin-credentials",
  ]
}
