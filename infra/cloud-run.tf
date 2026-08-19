resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloud_run_v2_service" "api" {
  name                = "api"
  location            = "us-east4"
  deletion_protection = false

  template {
    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"
    }
  }

  # The real deploy pipeline (ADR 0004) owns the image/revision from here on — don't fight it over these on every plan.
  lifecycle {
    ignore_changes = [client, client_version, template[0].containers[0].image]
  }

  depends_on = [google_project_service.run]
}
