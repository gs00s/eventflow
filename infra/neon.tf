provider "neon" {}

resource "neon_project" "app" {
  name      = "eventflow"
  region_id = "aws-us-east-1"

  branch {
    database_name = "eventflow"
  }
}

output "database_url" {
  value     = neon_project.app.connection_uri_pooler
  sensitive = true
}
