#!/bin/bash

echo "📦 Deleting Playwright deployment..."
kubectl delete deployment playwright-load-tester

echo "📦 Deleting monitoring stack via Helm..."
helm uninstall loki -n monitoring

echo "🧹 Deleting monitoring namespace..."
kubectl delete namespace monitoring

echo "✅ Teardown complete."
