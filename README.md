# Kubernetes-based Load Testing with Playwright

This project implements a distributed load testing solution using Playwright and Kubernetes. It measures page load times and provides real-time metrics through Prometheus and Grafana.

## Architecture

The solution consists of:
- Load testing workers running Playwright
- Prometheus for metrics collection
- Grafana for visualization
- Kubernetes for orchestration

## Prerequisites

- Node.js 16+
- Docker
- Minikube or a Kubernetes cluster
- kubectl
- Terraform (for infrastructure setup)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Docker Image

```bash
docker build -t playwright-load-tester .
```

### 3. Deploy to Kubernetes

#### Using Minikube

1. Start Minikube:
```bash
minikube start
```

2. Deploy monitoring stack:
```bash
kubectl apply -f k8s/monitoring/local-monitoring.yaml
```

3. Deploy load testers:
```bash
kubectl apply -f k8s/load-tester.yaml
```

### 4. Access Monitoring

1. Prometheus UI:
```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```
Access at: http://localhost:9090

2. Grafana UI:
```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
```
Access at: http://localhost:3000
- Default credentials: admin/admin

## Configuration

### Environment Variables

- `TARGET_URL`: URL to test (default: http://localhost:3000)
- `CONCURRENT_SESSIONS`: Number of concurrent test sessions (default: 5)
- `TEST_DURATION`: Test duration in milliseconds (default: 300000)
- `THINK_TIME`: Time between requests in milliseconds (default: 2000)

### Metrics

The solution exposes the following metrics:

- `playwright_page_load_time_seconds`: Histogram of page load times
- `playwright_page_load_errors_total`: Counter of page load errors

## Monitoring

### Prometheus Queries

Example queries for Prometheus:

1. Average page load time:
```
rate(playwright_page_load_time_seconds_sum[5m]) / rate(playwright_page_load_time_seconds_count[5m])
```

2. Error rate:
```
rate(playwright_page_load_errors_total[5m])
```

### Grafana Dashboards

Import the following dashboard to visualize the metrics:
1. Go to Grafana UI
2. Navigate to Dashboards > Import
3. Use the dashboard ID: [TODO: Add dashboard ID]

## Troubleshooting

### Common Issues

1. Pods not starting:
```bash
kubectl describe pod <pod-name> -n monitoring
kubectl logs <pod-name> -n monitoring
```

2. Metrics not showing:
```bash
kubectl port-forward <pod-name> 3000:3000
curl localhost:3000/metrics
```

3. Prometheus targets:
```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Check targets in Prometheus UI
```

## Development

### Adding New Tests

1. Modify `src/worker.js` to add new test scenarios
2. Rebuild and redeploy:
```bash
docker build -t playwright-load-tester .
kubectl rollout restart deployment playwright-load-tester
```

### Local Development

1. Start the worker locally:
```bash
node src/worker.js
```

2. Access metrics:
```bash
curl localhost:3000/metrics
```

## License

MIT 