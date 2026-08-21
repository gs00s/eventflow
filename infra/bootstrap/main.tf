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

variable "project_id" {
  type    = string
  default = "eventflow-506013"
}

provider "google" {
  project = var.project_id
}
