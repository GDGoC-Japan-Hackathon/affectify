output "provider_name" {
  value = google_iam_workload_identity_pool_provider.this.name
}

output "pool_name" {
  value = google_iam_workload_identity_pool.this.name
}
