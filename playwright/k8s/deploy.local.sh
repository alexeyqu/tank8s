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

# Build Docker image
echo "Building Docker image..."
docker build -t playwright-load-tester:latest ..

# Apply deployment
echo "Applying deployment..."
kubectl apply -f deployment.local.yaml

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/playwright-load-tester

echo "Deployment complete!"

# Print logs
echo "To view logs, run:"
echo "kubectl logs -f deployment/playwright-load-tester"

# Print delete command
echo "To delete deployment, run:"
echo "kubectl delete -f deployment.local.yaml" 