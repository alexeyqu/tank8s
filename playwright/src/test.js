const { chromium } = require('@playwright/test');

const { logToLoki, think, logger } = require('./utils');

async function measurePageLoad(config, page, url) {
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
    if (!config.debug) {
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


async function runTestSession(config, sessionId) {
  const browser = await chromium.launch();

  logger.info('Starting test session', { sessionId });

  const startTime = Date.now();
  const results = [];

  while (Date.now() - startTime < config.testDuration) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'PlaywrightLoadTestBot/1.0'
    });
    await context.setExtraHTTPHeaders({
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
    const page = await context.newPage();

    for (const path of config.pagesToTest) {
      const url = `${config.targetUrl}${path}`;
      const result = await measurePageLoad(config, page, url);
      results.push(result);
      
      // Add think time between requests
      await think(config.thinkTime / 2, config.thinkTime * 1.5); // jitter
    }
  }

  await browser.close();
  return results;
}

module.exports = {
  runTestSession,
};