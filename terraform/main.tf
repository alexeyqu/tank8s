terraform {
  required_version = ">= 1.3.0"
  backend "s3" {
    bucket = "tank-bucket-lxqu"
    key            = "aws-k8s-playwright/terraform.tfstate"
    region         = "eu-north-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}

provider "aws" {
  region = var.region
}
