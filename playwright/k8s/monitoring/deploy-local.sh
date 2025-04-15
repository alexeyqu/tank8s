#!/bin/bash

NAMESPACE=monitoring
RELEASE_NAME=loki
GRAFANA_PASSWORD=admin

# Create namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Add Helm repo
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm upgrade --install $RELEASE_NAME grafana/loki-stack \
  -n $NAMESPACE \
  -f ./loki-values.yaml