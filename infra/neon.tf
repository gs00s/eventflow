provider "neon" {}

resource "neon_project" "app" {
  name                      = "eventflow"
  region_id                 = "aws-us-east-1"
  history_retention_seconds = 21600 # 6h

  branch {
    database_name = "eventflow"
  }
}
