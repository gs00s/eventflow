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

      # Must match docker/datadog/conf.d/tcp_logs.d/conf.yaml's hardcoded port.
      env {
        name  = "DATADOG_LOG_TCP_PORT"
        value = "10514"
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

    containers {
      name  = "datadog-agent"
      image = "gcr.io/google-containers/pause:3.2"

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
