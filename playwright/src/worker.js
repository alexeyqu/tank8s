const { runTestSession } = require('./test');
const { logger } = require('./utils');

require('dotenv').config();

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

async function main() {
  logger.info('Starting load test', {
    config: CONFIG,
    timestamp: new Date().toISOString()
  });

  const sessions = Array(CONFIG.concurrentSessions)
    .fill()
    .map((_, i) => runTestSession(CONFIG, i + 1));

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
