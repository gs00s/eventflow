resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloud_run_v2_service" "api" {
  name                = "api"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      name  = "api"
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      # Waits for the sidecar's startup probe, so the Agent is ready before the app starts
      # sending it logs.
      depends_on = ["datadog-agent"]

      ports {
        container_port = 8080
      }

      env {
        name  = "CORS_ORIGIN"
        value = "https://${google_firebase_hosting_site.app.site_id}.web.app"
      }

      env {
        name  = "BETTER_AUTH_URL"
        value = "https://${google_firebase_hosting_site.app.site_id}.web.app/api"
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "BETTER_AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_better_auth_secret.secret_id
            version = "latest"
          }
        }
      }
    }

    # Full `datadog-agent` image, not Datadog's `serverless-init` — that pairs with dd-trace and
    # has no path for scraping custom Prometheus counters (added in a follow-up). See docs/adrs/0006.
    # conf.d is baked into the image at docker/datadog/Dockerfile, since Cloud Run has no
    # bind-mount mechanism for arbitrary config files.
    containers {
      name  = "datadog-agent"
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      env {
        name  = "DD_SITE"
        value = "us5.datadoghq.com"
      }

      env {
        name  = "DD_APM_ENABLED"
        value = "false"
      }

      env {
        name  = "DD_LOGS_ENABLED"
        value = "true"
      }

      env {
        name = "DD_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_datadog_api_key.secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/live"
          port = 5555
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image,
      template[0].containers[1].image,
    ]
  }

  depends_on = [google_project_service.run]
}
