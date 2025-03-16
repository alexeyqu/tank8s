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

module "vpc" {
  source = "./modules/vpc"

  vpc_name = var.vpc_name
}

module "eks" {
  source = "./modules/eks"

  cluster_name       = var.cluster_name
  kubernetes_version = "1.27"
  subnet_ids         = module.vpc.public_subnet_ids
}
