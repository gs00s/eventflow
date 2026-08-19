terraform {
  required_version = "1.15.8"

  cloud {
    organization = "Eventflow"

    workspaces {
      name = "eventflow-cli"
    }
  }

  required_providers {
    neon = {
      source = "kislerdm/neon"
    }
  }
}
