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

# Firebase Hosting's classic rewrite has no per-project service agent — it requires the target service to be public (see ADR 0004).
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Hosting content/rewrites/versions/releases are owned by `firebase deploy --only hosting` (firebase.json) from here on,
# not Terraform — every CI deploy creates its own version, so tracking one here would fight the CLI on the next apply.
