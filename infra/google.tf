variable "project_id" {
  type    = string
  default = "eventflow-506013"
}

variable "region" {
  type    = string
  default = "us-east4"
}

provider "google" {
  project = var.project_id
}

provider "google-beta" {
  project = var.project_id
}

data "google_project" "current" {}

output "gcp_project_number" {
  value = data.google_project.current.number
}

output "gcp_project_id" {
  value = var.project_id
}
