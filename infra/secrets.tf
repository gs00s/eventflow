resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

locals {
  default_compute_sa = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "eventflow-api-database-url"
  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = neon_project.app.connection_uri_pooler
}

resource "google_secret_manager_secret_iam_member" "database_url_accessor" {
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = local.default_compute_sa
}

resource "google_secret_manager_secret" "better_auth_secret" {
  secret_id = "eventflow-api-better-auth-secret"
  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_iam_member" "better_auth_secret_accessor" {
  secret_id = google_secret_manager_secret.better_auth_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = local.default_compute_sa
}
