variable "region" {
  default = "eu-north-1"
}

variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
  default     = "tank-vpc"
}

variable "cluster_name" {
  description = "Name of the cluster"
  type        = string
  default     = "tank-eks"
}
