const { chromium } = require('@playwright/test');
const winston = require('winston');
const path = require('path');

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
    '/about',
    '/contact'
  ],
  concurrentSessions: parseInt(process.env.CONCURRENT_SESSIONS) || 5,
  testDuration: parseInt(process.env.TEST_DURATION) || 300000, // 5 minutes in milliseconds
  thinkTime: parseInt(process.env.THINK_TIME) || 2000, // 2 seconds between requests
};

// Log the configuration at startup
logger.info('Starting load test with configuration', {
  config: CONFIG,
  timestamp: new Date().toISOString()
});

async function measurePageLoad(page, url) {
  const startTime = Date.now();
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    logger.info('Page load metrics', {
      url,
      loadTime,
      status: response.status(),
      timestamp: new Date().toISOString()
    });

    return {
      url,
      loadTime,
      status: response.status(),
      success: response.ok()
    };
  } catch (error) {
    logger.error('Page load failed', {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return {
      url,
      loadTime: -1,
      status: -1,
      success: false,
      error: error.message
    };
  }
}

async function runTestSession(sessionId) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  logger.info('Starting test session', { sessionId });

  const startTime = Date.now();
  const results = [];

  while (Date.now() - startTime < CONFIG.testDuration) {
    for (const path of CONFIG.pagesToTest) {
      const url = `${CONFIG.targetUrl}${path}`;
      const result = await measurePageLoad(page, url);
      results.push(result);
      
      // Add think time between requests
      await new Promise(resolve => setTimeout(resolve, CONFIG.thinkTime));
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