# Tank8s Load Testing Worker

A Playwright-based load testing worker that measures page load times and performance metrics for web applications.

## Features

- Concurrent session testing
- Multiple page testing
- Detailed performance metrics
- JSON logging
- Configurable test parameters
- Docker support

## Installation

### Local Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

### Docker Installation

1. Build the Docker image:
```bash
docker-compose build
```

2. Run the load test:
```bash
docker-compose up
```

## Configuration

The load tester can be configured through environment variables:

- `TARGET_URL`: The base URL of the application to test (default: http://localhost:3000)
- `CONCURRENT_SESSIONS`: Number of concurrent test sessions (default: 5)
- `TEST_DURATION`: Test duration in milliseconds (default: 300000 - 5 minutes)
- `THINK_TIME`: Time between requests in milliseconds (default: 2000 - 2 seconds)

### Docker Configuration

When using Docker, you can set environment variables in the following ways:

1. Using docker-compose:
```bash
TARGET_URL=http://your-app.com docker-compose up
```

2. Using a .env file:
```bash
echo "TARGET_URL=http://your-app.com" > .env
docker-compose up
```

## Usage

### Local Usage

Run the load test:
```bash
npm test
```

### Docker Usage

Run the load test:
```bash
docker-compose up
```

The test will:
1. Launch multiple concurrent browser sessions
2. Visit each configured page repeatedly
3. Measure and log load times
4. Generate a summary report

## Output

The test generates two types of logs:
1. Console output with real-time metrics
2. `logs/load-test.log` file with detailed JSON-formatted results

When using Docker, logs are persisted in the `logs` directory on your host machine.

## Customization

To test different pages, modify the `pagesToTest` array in `src/worker.js`:

```javascript
pagesToTest: [
  '/',
  '/about',
  '/contact'
]
```

## Metrics Collected

- Page load time
- HTTP status codes
- Success/failure rates
- Minimum and maximum load times
- Average load times per page 