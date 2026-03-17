output "artifact_registry_repository" {
  value = module.artifact_registry.repository_name
}

output "cloud_run_service_url" {
  value = module.cloud_run.service_url
}

output "cloud_sql_instance_connection_name" {
  value = module.cloud_sql.instance_connection_name
}

output "github_workload_identity_provider" {
  value = module.github_wif.provider_name
}

output "github_deployer_service_account" {
  value = google_service_account.github_deployer.email
}
