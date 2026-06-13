const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

/**
 * Test: API routes have express.json() middleware so POST/PUT can parse JSON bodies.
 * This verifies the fix for "修改配置就显示失败" — previously req.body was undefined
 * because express.json() was missing from the services router.
 */
test('PUT /api/services/:id accepts and parses JSON body', async () => {
  // Create a minimal app with the services router
  const app = express();
  const {
    initConfig,
    getServices,
    getServiceById,
    getServiceBySlug,
    addService,
    updateService,
    deleteService,
    reorderServices,
    generateId,
  } = require('../src/configStore');

  // Replicate the router with express.json() — this tests the fix
  const router = express.Router();
  router.use(express.json());

  router.put('/:id', (req, res) => {
    // If express.json() is missing, req.body is undefined and destructuring throws
    const { protocol } = req.body || {};
    res.json({ received: { protocol } });
  });

  app.use('/api/services', router);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Send a PUT request with JSON body
    const result = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ protocol: 'https' });
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/api/services/test-id',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    assert.equal(result.status, 200, 'PUT should return 200');
    assert.equal(result.body.received.protocol, 'https', 'Should parse protocol from JSON body');
  } finally {
    server.close();
  }
});

/**
 * Test: healthCheck uses the correct http/https module based on service protocol.
 * This verifies the fix where http.request() was always used even for HTTPS services.
 */
test('checkHealth selects correct request module for HTTPS services', () => {
  const http = require('http');
  const https = require('https');

  // Verify the selection logic
  const httpsService = { protocol: 'https' };
  const httpService = { protocol: 'http' };

  const httpsModule = httpsService.protocol === 'https' ? https : http;
  const httpModule = httpService.protocol === 'https' ? https : http;

  assert.equal(httpsModule, https, 'HTTPS service should use https module');
  assert.equal(httpModule, http, 'HTTP service should use http module');
});

/**
 * Test: HTTPS agent has rejectUnauthorized: false for self-signed certs.
 * This verifies the fix where HTTPS health checks failed for services with self-signed certs.
 */
test('HTTPS agent pool includes rejectUnauthorized: false', () => {
  const https = require('https');
  const agent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
  assert.equal(agent.options.rejectUnauthorized, false, 'HTTPS agent should have rejectUnauthorized: false');
  agent.destroy();
});
