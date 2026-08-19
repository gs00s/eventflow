provider "google" {
  project = "eventflow-506013"
}

data "google_project" "current" {}

output "gcp_project_number" {
  value = data.google_project.current.number
}
