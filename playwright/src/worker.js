const { chromium } = require('@playwright/test');
const winston = require('winston');
const path = require('path');
const express = require('express');

async function logToLoki(message, labels = {}) {
  const stream = {
    stream: {
      job: 'playwright',
      ...labels,
    },
    values: [
      // time in nanoseconds, message
      [Date.now() * 1_000_000 + '', message],
    ],
  };

  const body = {
    streams: [stream],
  };

  try {
    await fetch('http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Failed to push to Loki', err);
  }
}

// Start metrics server
const app = express();
const port = 3000;

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/metrics', async (req, res) => {
  try {
    console.log('Metrics endpoint called');
    const metrics = await register.metrics();
    console.log('Metrics collected:', metrics);
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (error) {
    console.error('Error collecting metrics:', error);
    res.status(500).send('Error collecting metrics');
  }
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(port, () => {
  console.log(`Metrics server listening on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/health`);
  console.log(`Metrics available at http://localhost:${port}/metrics`);
});

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/load-test.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Configuration
const CONFIG = {
  targetUrl: process.env.TARGET_URL || 'http://localhost:3000',
  pagesToTest: [
    '/',
  ],
  concurrentSessions: parseInt(process.env.CONCURRENT_SESSIONS) || 5,
  testDuration: parseInt(process.env.TEST_DURATION) || 300000, // 5 minutes in milliseconds
  thinkTime: parseInt(process.env.THINK_TIME) || 2000, // 2 seconds between requests
  debug: process.env.DEBUG === 'true',
};

// Log the configuration at startup
logger.info('Starting load test with configuration', {
  config: CONFIG,
  timestamp: new Date().toISOString()
});

async function setupRouteInterception(page, sessionId) {
  await page.route("**/*", (route, request) => {
    const url = request.url();
    const resourceType = request.resourceType(); // e.g. 'document', 'script', 'style', etc.

    const isStatic = ['script', 'stylesheet', 'image', 'font'].includes(resourceType);

    if (isStatic) {
      const newUrl = url.includes('?')
        ? `${url}&testid=${sessionId}`
        : `${url}?testid=${sessionId}`;

      console.log(`Intercepting request: ${url} -> ${newUrl}`);

      return route.continue({ url: newUrl });
    }

    return route.continue(); // let other requests through untouched
  });
}

async function measurePageLoad(page, url) {
  const startTime = Date.now();
  try {
    const response = await page.goto(url, { waitUntil: 'load' });
    const loadTime = (Date.now() - startTime) / 1000;

    const perf = await page.evaluate(() => {
      const timing = performance.timing;
      const paints = performance.getEntriesByType('paint');
      let fcp = null;
      for (const p of paints) {
        if (p.name === 'first-contentful-paint') {
          fcp = p.startTime;
        }
      }
      return {
        navigationStart: timing.navigationStart,
        responseStart: timing.responseStart,
        loadEventEnd: timing.loadEventEnd,
        firstContentfulPaint: fcp
      };
    });
    
    const ttfb = (perf.responseStart - perf.navigationStart) / 1000;
    const ttl = (perf.loadEventEnd - perf.navigationStart) / 1000;
    const fcp = perf.firstContentfulPaint ? perf.firstContentfulPaint / 1000 : null;

    console.log(`Page load time for ${url}: ${ttl} seconds or ${loadTime} seconds`);

    const headers = response.headers();
    const w3tcCache = headers['x-powered-by'] || headers['x-cache'] || headers['w3tc-cache'];
    const cacheControl = headers['cache-control'] || null;

    const log = {
      url,
      loadTime,
      ttfb,
      fcp,
      status: response.status().toString(),
      w3tcCache,
      cacheControl,
      ts: new Date().toISOString(),
    };

    // Record metrics
    if (!CONFIG.debug) {
      await logToLoki(JSON.stringify(log));
    }
    logger.info('Page load metrics', log);
    
    return {
      ...log,
      success: response.ok()
    };
  } catch (error) {
    // Record error metrics
    // pageLoadErrors.inc({ url });
    
    logger.error('Page load failed', {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return {
      url,
      loadTime: -1,
      ttfb: null,
      status: -1,
      success: false,
      error: error.message
    };
  }
}

const think = (min, max) => new Promise(resolve => {
  const delay = Math.floor(Math.random() * (max - min)) + min;
  setTimeout(resolve, delay);
});


async function runTestSession(sessionId) {
  const browser = await chromium.launch();

  logger.info('Starting test session', { sessionId });

  const startTime = Date.now();
  const results = [];

  while (Date.now() - startTime < CONFIG.testDuration) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'PlaywrightLoadTestBot/1.0'
    });
    await context.setExtraHTTPHeaders({
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
    const page = await context.newPage();

    // await setupRouteInterception(page, sessionId);

    for (const path of CONFIG.pagesToTest) {
      const url = `${CONFIG.targetUrl}${path}`;
      const result = await measurePageLoad(page, url);
      results.push(result);
      
      // Add think time between requests
      await think(CONFIG.thinkTime / 2, CONFIG.thinkTime * 1.5); // jitter
    }
  }

  await browser.close();
  return results;
}

async function main() {
  logger.info('Starting load test', {
    config: CONFIG,
    timestamp: new Date().toISOString()
  });

  const sessions = Array(CONFIG.concurrentSessions)
    .fill()
    .map((_, i) => runTestSession(i + 1));

  const allResults = await Promise.all(sessions);

  // Aggregate results
  const aggregatedResults = allResults.flat().reduce((acc, result) => {
    if (!acc[result.url]) {
      acc[result.url] = {
        totalLoadTime: 0,
        successfulRequests: 0,
        failedRequests: 0,
        minLoadTime: Infinity,
        maxLoadTime: 0
      };
    }

    const stats = acc[result.url];
    if (result.success) {
      stats.totalLoadTime += result.loadTime;
      stats.successfulRequests++;
      stats.minLoadTime = Math.min(stats.minLoadTime, result.loadTime);
      stats.maxLoadTime = Math.max(stats.maxLoadTime, result.loadTime);
    } else {
      stats.failedRequests++;
    }

    return acc;
  }, {});

  // Log summary
  logger.info('Load test completed', {
    summary: Object.entries(aggregatedResults).map(([url, stats]) => ({
      url,
      averageLoadTime: stats.totalLoadTime / stats.successfulRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      minLoadTime: stats.minLoadTime,
      maxLoadTime: stats.maxLoadTime
    })),
    timestamp: new Date().toISOString()
  });
}

main().catch(error => {
  logger.error('Load test failed', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
}); 