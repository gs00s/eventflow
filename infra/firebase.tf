resource "google_project_service" "firebasehosting" {
  service            = "firebasehosting.googleapis.com"
  disable_on_destroy = false
}

resource "google_firebase_hosting_site" "app" {
  provider = google-beta
  project  = "eventflow-506013"
  site_id  = "eventflow-506013"

  depends_on = [google_project_service.firebasehosting]
}

# Resolves Firebase Hosting's own service agent so the rewrite below can be granted run.invoker directly — no allUsers.
resource "google_project_service_identity" "firebasehosting" {
  provider = google-beta
  project  = "eventflow-506013"
  service  = "firebasehosting.googleapis.com"

  depends_on = [google_project_service.firebasehosting]
}

resource "google_cloud_run_v2_service_iam_member" "firebasehosting_invoker" {
  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  member   = google_project_service_identity.firebasehosting.member
}

resource "google_firebase_hosting_version" "default" {
  provider = google-beta
  site_id  = google_firebase_hosting_site.app.site_id

  config {
    rewrites {
      glob = "/api/**"
      run {
        service_id = google_cloud_run_v2_service.api.name
        region     = google_cloud_run_v2_service.api.location
      }
    }
  }
}

resource "google_firebase_hosting_release" "default" {
  provider     = google-beta
  site_id      = google_firebase_hosting_site.app.site_id
  version_name = google_firebase_hosting_version.default.name
  type         = "DEPLOY"
  message      = "Empty rewrite-only release (issue #59) — no real Hosting content yet"
}
