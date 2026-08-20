resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "eventflow" {
  location      = "us-east4"
  repository_id = "eventflow"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry]
}
