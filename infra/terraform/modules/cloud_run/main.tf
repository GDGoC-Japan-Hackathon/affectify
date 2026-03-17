resource "google_cloud_run_v2_service" "this" {
  name     = var.service_name
  project  = var.project_id
  location = var.region
  deletion_protection = false
  invoker_iam_disabled = true

  template {
    service_account = var.service_account_email

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
      image = var.image

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

      ports {
        container_port = 8080
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"

  lifecycle {
    ignore_changes = [
      scaling,
    ]
  }
}
