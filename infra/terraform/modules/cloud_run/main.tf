resource "google_cloud_run_v2_service" "this" {
  name                 = var.service_name
  project              = var.project_id
  location             = var.region
  deletion_protection  = false
  invoker_iam_disabled = true

  template {
    service_account = var.service_account_email

    # Cloud SQL 接続情報は Cloud Run 側で volume として提供される。
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

      # backend は /cloudsql/<INSTANCE_CONNECTION_NAME> を host として DSN を組み立てる。
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
    # provider が 0 値を毎回返してくるため、未指定の scaling 差分は無視する。
    ignore_changes = [
      scaling,
    ]
  }
}
