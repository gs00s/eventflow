locals {
  repository = "gs00s/eventflow"
}

data "google_project" "current" {}

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iamcredentials" {
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sts" {
  service            = "sts.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudresourcemanager" {
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_iam_workload_identity_pool" "github_actions" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"

  depends_on = [google_project_service.iam]
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  # The issuer below is shared by every GitHub repo — this condition is what actually scopes trust to ours.
  attribute_condition = "assertion.repository == \"${local.repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "github_actions_deployer" {
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions deployer"

  depends_on = [google_project_service.iam]
}

resource "google_service_account_iam_member" "github_actions_wif" {
  service_account_id = google_service_account.github_actions_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/${local.repository}"
}

# Write-level roles get added here one at a time, as each later ticket needs them.
resource "google_project_iam_member" "github_actions_viewer" {
  project = "eventflow-506013"
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.github_actions_deployer.email}"
}

resource "google_project_iam_member" "github_actions_run_admin" {
  project = "eventflow-506013"
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions_deployer.email}"
}

resource "google_project_iam_member" "github_actions_firebasehosting_admin" {
  project = "eventflow-506013"
  role    = "roles/firebasehosting.admin"
  member  = "serviceAccount:${google_service_account.github_actions_deployer.email}"
}

# Lets infra/ enable run.googleapis.com / firebasehosting.googleapis.com itself, instead of another manual bootstrap apply per API.
resource "google_project_iam_member" "github_actions_serviceusage_admin" {
  project = "eventflow-506013"
  role    = "roles/serviceusage.serviceUsageAdmin"
  member  = "serviceAccount:${google_service_account.github_actions_deployer.email}"
}

# Cloud Run revisions run as the default Compute SA unless overridden; deploying against it needs actAs on that identity.
resource "google_service_account_iam_member" "github_actions_default_compute_sa_user" {
  service_account_id = "projects/eventflow-506013/serviceAccounts/${data.google_project.current.number}-compute@developer.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions_deployer.email}"
}

output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github_actions.name
}

output "service_account_email" {
  value = google_service_account.github_actions_deployer.email
}
