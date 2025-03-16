variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.27"
}

variable "subnet_ids" {
  description = "List of subnet IDs where EKS will be deployed"
  type        = list(string)
}
