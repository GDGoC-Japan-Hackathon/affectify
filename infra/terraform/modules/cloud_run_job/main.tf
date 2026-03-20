resource "google_cloud_run_v2_job" "this" {
  name                = var.job_name
  project             = var.project_id
  location            = var.region
  deletion_protection = false

  template {
    task_count  = var.task_count
    parallelism = var.parallelism

    template {
      service_account = var.service_account_email
      max_retries     = var.max_retries
      timeout         = var.timeout

      dynamic "volumes" {
        for_each = length(var.cloud_sql_instances) > 0 ? [1] : []
        content {
          name = "cloudsql"

          cloud_sql_instance {
            instances = var.cloud_sql_instances
          }
        }
      }

      containers {
        image   = var.image
        command = var.command
        args    = var.args

        dynamic "volume_mounts" {
          for_each = length(var.cloud_sql_instances) > 0 ? [1] : []
          content {
            name       = "cloudsql"
            mount_path = "/cloudsql"
          }
        }

        dynamic "env" {
          for_each = var.env
          content {
            name  = env.key
            value = env.value
          }
        }

        dynamic "env" {
          for_each = var.secret_env
          content {
            name = env.key
            value_source {
              secret_key_ref {
                secret  = env.value
                version = "latest"
              }
            }
          }
        }
      }
    }
  }
}
