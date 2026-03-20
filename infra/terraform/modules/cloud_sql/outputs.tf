output "instance_connection_name" {
  value = google_sql_database_instance.this.connection_name
}

output "instance_name" {
  value = google_sql_database_instance.this.name
}

output "database_name" {
  value = google_sql_database.app.name
}

output "user_name" {
  value = google_sql_user.app.name
}
