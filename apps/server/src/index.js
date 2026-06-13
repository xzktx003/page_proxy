const express = require('express');
const cors = require('cors');
const path = require('path');
const { initConfig, getServices } = require('./configStore');
const servicesRouter = require('./routes/services');
const { createProxyHandler, createProxyUpgradeHandler, createRefererProxyHandler } = require('./routes/proxy');
const { startHealthCheck, stopHealthCheck } = require('./healthCheck');

const app = express();

const DEFAULT_PORT = 8888;
const PORT = process.env.PAGE_PROXY_PORT ? parseInt(process.env.PAGE_PROXY_PORT, 10) : DEFAULT_PORT;
const distPath = path.join(__dirname, '../../../apps/web/dist');
const spaPath = path.join(distPath, 'index.html');

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('X-Powered-By');
  next();
});

// Middleware
app.use(cors());
// NOTE: Do NOT add express.json() globally - it consumes POST body for proxied requests
// Use raw body parsing only for specific API routes

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/') || req.path.includes('/@vite/')) {
      console.log(`${res.statusCode} ${req.method} ${req.path} ${duration}ms`);
    }
  });
  next();
});

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(60000, () => {
    if (!res.writableEnded) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

// API routes
app.use('/api/services', servicesRouter);

// Health check API
app.get('/api/health', (req, res) => {
  const services = getServices();
  res.json({ health: services.map(s => ({ slug: s.slug, name: s.name, online: s.online, lastCheck: s.lastCheck })) });
});

// Static files
app.use(express.static(distPath, { index: false, maxAge: '1h' }));

// Proxy middleware — handles /:slug/ and /:slug/* ONLY (strict: no /:slug exact)
const proxyHandler = createProxyHandler();
app.use('/:slug/', proxyHandler);

// Some proxied SPAs call root APIs such as /configs or /api/templates.
// If the request comes from a proxied iframe, route it back to that service.
app.use(createRefererProxyHandler());

// SPA fallback — serves index.html for /:slug (no trailing slash) and all other routes
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(spaPath, (err) => {
    if (err) {
      res.status(404).send(`
        <html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;">
        <div style="text-align:center;">
          <h1>📦 Page Proxy</h1>
          <p>Frontend not built yet. Run <code>cd apps/web && npm run build</code></p>
        </div>
        </body></html>
      `);
    }
  });
});

// Initialize
initConfig();
startHealthCheck();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Page Proxy Server running at http://0.0.0.0:${PORT}`);
  console.log(`   LAN access: http://<your-ip>:${PORT}`);
  console.log(`   Easy to remember: http://localhost:${PORT}\n`);
});

// Increase socket listeners to prevent warnings
server.setMaxListeners(50);

server.on('upgrade', createProxyUpgradeHandler());

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ 端口 ${PORT} 已被占用，无法启动服务。`);
    console.error(`   请通过以下方式指定其他端口：`);
    console.error(`     PAGE_PROXY_PORT=39197 node src/index.js\n`);
  } else {
    console.error('❌ 服务器启动失败:', err.message);
  }
  process.exit(1);
});

process.on('SIGTERM', () => { stopHealthCheck(); process.exit(0); });
process.on('SIGINT', () => { stopHealthCheck(); process.exit(0); });

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
