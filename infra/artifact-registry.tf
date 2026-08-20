resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "api" {
  location      = "us-east4"
  repository_id = "api"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry]
}
