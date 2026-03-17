variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "instance_name" {
  type = string
}

variable "database_name" {
  type = string
}

variable "user_name" {
  type = string
}

variable "user_password" {
  type      = string
  sensitive = true
}

variable "tier" {
  type = string
}

variable "backup_start_time" {
  type    = string
  default = "03:00"
}
