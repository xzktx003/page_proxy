const http = require('http');
const https = require('https');
const { getServices, updateHealthStatus } = require('./configStore');

// Shared agents for connection pooling (Node.js doesn't support maxTotalSockets)
const checkAgents = {
  http: new http.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, timeout: 3000 }),
  https: new https.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, timeout: 3000, rejectUnauthorized: false }),
};

const CHECK_INTERVAL = 30_000; // 30 seconds
const CHECK_TIMEOUT = 3_000; // 3 seconds

let _intervalId = null;

/**
 * Check health of a single service
 * @returns {boolean} true if online
 */
function checkHealth(service) {
  return new Promise((resolve) => {
    const url = `${service.protocol}://${service.targetIp}:${service.targetPort}${service.healthCheckPath || '/'}`;
    const agent = checkAgents[service.protocol] || checkAgents.http;
    const requestModule = service.protocol === 'https' ? https : http;
    const req = requestModule.request(url, {
      method: 'HEAD',
      timeout: CHECK_TIMEOUT,
      agent,
    }, (res) => {
      res.resume(); // consume response to free up memory
      const online = res.statusCode >= 200 && res.statusCode < 500;
      updateHealthStatus(service.slug, online);
      resolve(online);
    });

    req.on('error', () => {
      updateHealthStatus(service.slug, false);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      updateHealthStatus(service.slug, false);
      resolve(false);
    });

    req.end();
  });
}

/**
 * Check health of all services
 */
async function checkAllHealth() {
  const services = getServices();
  const promises = services.map(s => checkHealth(s));
  await Promise.allSettled(promises);
}

/**
 * Start periodic health checks
 */
function startHealthCheck() {
  // Initial check after 2 seconds
  setTimeout(checkAllHealth, 2_000);
  // Periodic checks
  _intervalId = setInterval(checkAllHealth, CHECK_INTERVAL);
  console.log(`[HealthCheck] Started periodic health checks every ${CHECK_INTERVAL / 1000}s`);
}

/**
 * Stop periodic health checks
 */
function stopHealthCheck() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

module.exports = { checkHealth, startHealthCheck, stopHealthCheck };
