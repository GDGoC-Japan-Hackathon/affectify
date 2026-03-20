variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "job_name" {
  type = string
}

variable "service_account_email" {
  type = string
}

variable "image" {
  type = string
}

variable "cloud_sql_instances" {
  type    = list(string)
  default = []
}

variable "env" {
  type    = map(string)
  default = {}
}

variable "secret_env" {
  type    = map(string)
  default = {}
}

variable "command" {
  type    = list(string)
  default = []
}

variable "args" {
  type    = list(string)
  default = []
}

variable "task_count" {
  type    = number
  default = 1
}

variable "parallelism" {
  type    = number
  default = 1
}

variable "max_retries" {
  type    = number
  default = 1
}

variable "timeout" {
  type    = string
  default = "1800s"
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}
