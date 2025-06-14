const winston = require('winston');
const path = require('path');

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

const think = (min, max) => new Promise(resolve => {
  const delay = Math.floor(Math.random() * (max - min)) + min;
  setTimeout(resolve, delay);
});

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


module.exports = {
  logToLoki,
  think,
  logger,
};