provider "neon" {}

resource "neon_project" "app" {
  name                      = "eventflow"
  region_id                 = "aws-us-east-1"
  history_retention_seconds = 21600 # 6h — the max the Free plan allows; the provider's own default (24h) exceeds it

  branch {
    database_name = "eventflow"
  }
}

output "database_url" {
  value     = neon_project.app.connection_uri_pooler
  sensitive = true
}
