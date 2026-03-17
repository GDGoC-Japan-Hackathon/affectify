variable "project_id" {
  type = string
}

variable "secret_ids" {
  type = set(string)
}

variable "secret_versions" {
  type      = map(string)
  default   = {}
  sensitive = true
}
