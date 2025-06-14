#!/bin/bash

# Exit on error
set -e

# Start minikube if not running
if ! minikube status &> /dev/null; then
    echo "Starting minikube..."
    minikube start --memory=4096 --cpus=4
fi

# Set docker env to use minikube's docker
eval $(minikube docker-env)

NAMESPACE=monitoring
RELEASE_NAME=loki
GRAFANA_PASSWORD=admin

# Create namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

kubectl label node minikube role=$NAMESPACE

# Add Helm repo
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm upgrade --install $RELEASE_NAME grafana/loki-stack \
  -n $NAMESPACE \
  -f ./loki-values.yaml

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/loki-grafana -n $NAMESPACE

minikube service loki-grafana -n $NAMESPACE