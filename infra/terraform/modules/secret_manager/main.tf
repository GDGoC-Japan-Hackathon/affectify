locals {
  secret_version_keys = nonsensitive(toset(keys(var.secret_versions)))
}

resource "google_secret_manager_secret" "this" {
  for_each = var.secret_ids

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "this" {
  for_each = local.secret_version_keys

  secret      = google_secret_manager_secret.this[each.key].id
  secret_data = var.secret_versions[each.key]
}
