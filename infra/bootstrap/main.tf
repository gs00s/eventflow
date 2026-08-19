terraform {
  required_version = "1.15.8"

  cloud {
    organization = "Eventflow"

    workspaces {
      name = "eventflow-bootstrap"
    }
  }

  required_providers {
    google = {
      source = "hashicorp/google"
    }
  }
}

provider "google" {
  project = "eventflow-506013"
}
