const http = require('http');
const https = require('https');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const { getServiceBySlug } = require('../configStore');

// Connection pool agents to reuse connections and prevent EADDRNOTAVAIL
const agentPool = new Map();

function getAgent(protocol, targetIp, targetPort) {
  const key = `${protocol}://${targetIp}:${targetPort}`;
  if (!agentPool.has(key)) {
    const Agent = protocol === 'https' ? https.Agent : http.Agent;
    agentPool.set(key, new Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,         // Max concurrent sockets per host
      maxFreeSockets: 20,     // Max idle sockets to keep in pool
      timeout: 60000,
      scheduling: 'fifo',
    ...(protocol === 'https' ? { rejectUnauthorized: false } : {}),
    }));
  }
  return agentPool.get(key);
}

// Cleanup stale agents periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, agent] of agentPool.entries()) {
    if (agent.idleTimeout && now > agent.idleTimeout + 300000) {
      agent.destroy();
      agentPool.delete(key);
    }
  }
}, 60000);

const upgradeProxyCache = new Map();
const refererProxyCache = new Map();

const REQUEST_TIMEOUT = 60_000; // 60 seconds

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldRewriteContent(contentType = '') {
  return /text\/html|text\/css|javascript|ecmascript/i.test(contentType);
}

function prefixRootPath(path, slug) {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (path === `/${slug}` || path.startsWith(`/${slug}/`)) return path;
  return `/${slug}${path}`;
}

function rewriteRootPathStrings(body, slug) {
  const escapedSlug = escapeRegExp(slug);
  const rootPathPattern = new RegExp(`(["'\`])/(?!/|${escapedSlug}(?:/|["'\`]))([^"'\\\`\\s<>)]*)`, 'g');
  return body.replace(rootPathPattern, (match, quote, rest) => `${quote}${prefixRootPath(`/${rest}`, slug)}`);
}

function rewriteJavaScriptPaths(body, slug) {
  const escapedSlug = escapeRegExp(slug);
  const moduleSpecifierPattern = new RegExp(
    `(\\bimport\\s*(?:[^"'\\\`]*?\\s+from\\s*)?|\\bexport\\s+[^"'\\\`]*?\\s+from\\s*|\\bimport\\s*\\(\\s*)(["'\\\`])/(?!/|${escapedSlug}(?:/|["'\\\`]))([^"'\\\`\\s)]*)`,
    'g',
  );
  const apiCallPattern = new RegExp(
    `(\\b(?:request|fetch|WebSocket)\\s*\\(\\s*)(["'\\\`])/(api|ws|vscode)([^"'\\\`]*)\\2`,
    'g',
  );
  const openCallPattern = new RegExp(
    `(\\.open\\s*\\(\\s*["'\\\`][A-Z]+["'\\\`]\\s*,\\s*)(["'\\\`])/(api|ws|vscode)([^"'\\\`]*)\\2`,
    'g',
  );

  return body
    .replace(moduleSpecifierPattern, (match, prefix, quote, rest) => `${prefix}${quote}${prefixRootPath(`/${rest}`, slug)}`)
    .replace(apiCallPattern, (match, prefix, quote, route, rest) => `${prefix}${quote}/${slug}/${route}${rest}${quote}`)
    .replace(openCallPattern, (match, prefix, quote, route, rest) => `${prefix}${quote}/${slug}/${route}${rest}${quote}`);
}

function rewriteCssUrls(body, slug) {
  const escapedSlug = escapeRegExp(slug);
  const cssUrlPattern = new RegExp(`url\\((["']?)/(?!/|${escapedSlug}(?:/|["')]))([^"')\\s]+)(["']?)\\)`, 'g');
  return body.replace(cssUrlPattern, (match, quote, rest, endQuote) => `url(${quote}${prefixRootPath(`/${rest}`, slug)}${endQuote})`);
}

function rewriteSrcsetValues(body, slug) {
  return body.replace(/\s(srcset)=["']([^"']+)["']/gi, (match, attr, value) => {
    const quote = match.includes(`${attr}="`) ? '"' : "'";
    const rewritten = value.split(',').map((part) => {
      const trimmed = part.trim();
      const [url, ...descriptor] = trimmed.split(/\s+/);
      const prefixed = prefixRootPath(url, slug);
      return [prefixed, ...descriptor].join(' ');
    }).join(', ');
    return ` ${attr}=${quote}${rewritten}${quote}`;
  });
}

function rewriteTemplateRootPaths(body, slug) {
  return body.replace(/(\$\{[^}]+\})\/(api|ws|vscode)(?=\/|["'`?])/g, `$1/${slug}/$2`);
}

function rewriteWebSocketTemplatesToTarget(body, slug, service) {
  const wsProtocol = service.protocol === 'https' ? 'wss' : 'ws';
  const wsBase = `${wsProtocol}://${service.targetIp}:${service.targetPort}`;
  return body.replace(new RegExp(`\\$\\{wsBase\\(\\)\\}/${escapeRegExp(slug)}/ws`, 'g'), `${wsBase}/ws`);
}

function rewriteProxyBody(body, contentType, slug) {
  if (!body || !shouldRewriteContent(contentType)) return body;

  let rewritten = body;
  if (/javascript|ecmascript/i.test(contentType)) {
    rewritten = rewriteJavaScriptPaths(rewritten, slug);
  } else {
    rewritten = rewriteRootPathStrings(rewritten, slug);
  }
  rewritten = rewriteTemplateRootPaths(rewritten, slug);
  rewritten = rewriteCssUrls(rewritten, slug);
  if (/text\/html/i.test(contentType)) {
    rewritten = rewriteSrcsetValues(rewritten, slug);
  }
  return rewritten;
}

function createViteClientShim() {
  return `
export function injectQuery(url) { return url; }
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  const hot = {
    data: {},
    accept() {},
    acceptExports() {},
    decline() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
  return hot;
}
window.__vite_plugin_react_preamble_installed__ = true;
console.debug('[page-proxy] Vite HMR client disabled for proxied service');
`;
}

function hardenProxyHeaders(headers) {
  delete headers['x-frame-options'];
  delete headers['content-security-policy'];
  delete headers['content-security-policy-report-only'];
  delete headers['x-powered-by'];
  delete headers['x-forwarded-for'];
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-proto'];
  headers['access-control-allow-origin'] = '*';
}

function getSlugFromReferer(req) {
  const referer = req.get && req.get('referer');
  if (!referer) return null;

  try {
    const refererUrl = new URL(referer, `${req.protocol || 'http'}://${req.get('host') || 'localhost'}`);
    const [slug] = refererUrl.pathname.split('/').filter(Boolean);
    return slug || null;
  } catch {
    return null;
  }
}

function isLikelyRootServiceRequest(pathname) {
  return /^\/(?:api(?:\/|$)|configs(?:\/|$)|traffic(?:\/|$)|version(?:\/|$)|connections(?:\/|$)|proxies(?:\/|$)|providers(?:\/|$)|rules(?:\/|$)|logs(?:\/|$))/.test(pathname) ||
    /^\/api\/(?:compile|models|transfer|ai)/.test(pathname);
}

function sendProxyError(err, req, res, service) {
  // Handle WebSocket errors (res is a Socket, not HTTP response)
  if (res && !res.writeHead) {
    if (res.destroy && !res.destroyed) {
      res.destroy();
    } else if (res.end && !res.writableEnded) {
      res.end();
    }
    return;
  }

  // Check if response is still writable
  if (res && (res.writableEnded || res.destroyed)) {
    return;
  }

  if (res && res.headersSent) {
    if (res.destroy) res.destroy();
    return;
  }

  if (res && res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>Service Unavailable</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);text-align:center;max-width:420px}
h2{color:#ef4444;margin-bottom:.5rem}p{color:#666}</style></head>
<body><div class="card"><h2>⚠️ 服务不可用</h2>
<p>无法连接到 <strong>${service?.name || 'Unknown'}</strong></p>
<p style="font-size:.85rem;color:#999">${service?.targetIp || '?'}:${service?.targetPort || '?'}</p>
<p style="font-size:.8rem;color:#bbb;margin-top:8px">${err?.code || err?.message || 'Unknown error'}</p>
</div></body></html>`);
  }
}

function createProxyHandler() {
  return (req, res, next) => {
    const slug = req.params.slug;
    const service = getServiceBySlug(slug);

    if (!service) {
      return next();
    }

    // Pass /:slug exact match to SPA fallback
    const slugPath = '/' + slug;
    if (req.originalUrl === slugPath || req.originalUrl.startsWith(slugPath + '?')) {
      return next();
    }

    const target = `${service.protocol}://${service.targetIp}:${service.targetPort}`;
    const prefix = `/${slug}`;
    const agent = getAgent(service.protocol, service.targetIp, service.targetPort);

    const proxyMiddleware = createProxyMiddleware({
      target,
      agent,
      changeOrigin: true,
      ws: true,
      pathRewrite: { [`^${prefix}`]: '' },
      selfHandleResponse: true,
      secure: service.protocol === 'https' ? false : undefined,
      proxyTimeout: REQUEST_TIMEOUT,
      onProxyReq: (proxyReq) => {
        if (!proxyReq.headersSent) {
          proxyReq.setHeader('X-Proxy-By', 'page-proxy');
        }
      },
      onProxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
        console.log(`${proxyRes.statusCode} ${req.method} ${req.originalUrl}`);
        hardenProxyHeaders(proxyRes.headers);
        if (req.originalUrl === `/${slug}/@vite/client` || req.originalUrl.startsWith(`/${slug}/@vite/client?`)) {
          proxyRes.headers['content-type'] = 'text/javascript; charset=utf-8';
          delete proxyRes.headers['content-length'];
          return createViteClientShim();
        }
        const contentType = proxyRes.headers['content-type'] || '';
        if (!shouldRewriteContent(contentType)) return responseBuffer;
        let body = rewriteProxyBody(responseBuffer.toString('utf8'), contentType, slug);
        if (/javascript|ecmascript/i.test(contentType)) {
          body = rewriteWebSocketTemplatesToTarget(body, slug, service);
        }
        return body;
      }),
      onError: (err, req, res) => {
        sendProxyError(err, req, res, service);
      },
    });

    proxyMiddleware(req, res, next);
  };
}

function createRefererProxyHandler() {
  return (req, res, next) => {
    if (!isLikelyRootServiceRequest(req.path || req.url || '')) {
      return next();
    }

    const slug = getSlugFromReferer(req);
    const service = slug ? getServiceBySlug(slug) : null;
    if (!service) {
      return next();
    }

    const target = `${service.protocol}://${service.targetIp}:${service.targetPort}`;
    const cacheKey = `${slug}:${target}:referer`;
    let proxyMiddleware = refererProxyCache.get(cacheKey);
    if (!proxyMiddleware) {
      const agent = getAgent(service.protocol, service.targetIp, service.targetPort);
      proxyMiddleware = createProxyMiddleware({
        target,
        agent,
        changeOrigin: true,
        ws: true,
        selfHandleResponse: true,
        secure: service.protocol === 'https' ? false : undefined,
        proxyTimeout: REQUEST_TIMEOUT,
        onProxyReq: (proxyReq) => {
          if (!proxyReq.headersSent) {
            proxyReq.setHeader('X-Proxy-By', 'page-proxy');
          }
        },
        onProxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
          hardenProxyHeaders(proxyRes.headers);
          const contentType = proxyRes.headers['content-type'] || '';
          if (!shouldRewriteContent(contentType)) return responseBuffer;
          let body = rewriteProxyBody(responseBuffer.toString('utf8'), contentType, slug);
          if (/javascript|ecmascript/i.test(contentType)) {
            body = rewriteWebSocketTemplatesToTarget(body, slug, service);
          }
          return body;
        }),
        onError: (err, req, res) => {
          sendProxyError(err, req, res, service);
        },
      });
      refererProxyCache.set(cacheKey, proxyMiddleware);
    }

    proxyMiddleware(req, res, next);
  };
}

function createProxyUpgradeHandler() {
  return (req, socket, head) => {
    // Extract slug from URL path
    const pathname = req.url || '/';
    const match = pathname.match(/^\/([^/?#]+)(?:\/|$)/);
    const slug = match && match[1];
    const service = slug ? getServiceBySlug(slug) : null;

    // Must have a valid service and not be the root path
    if (!service || pathname === `/${slug}` || pathname === `/${slug}/`) {
      socket.destroy();
      return;
    }

    const target = `${service.protocol}://${service.targetIp}:${service.targetPort}`;
    const prefix = `/${slug}`;

    // Rewrite URL: remove prefix
    req.url = pathname.replace(new RegExp(`^${escapeRegExp(prefix)}`), '') || '/';
    if (req.url === '' || req.url === prefix) {
      req.url = '/';
    }

    const cacheKey = `${slug}:${target}`;
    let proxyMiddleware = upgradeProxyCache.get(cacheKey);
    if (!proxyMiddleware) {
      const agent = getAgent(service.protocol, service.targetIp, service.targetPort);
      proxyMiddleware = createProxyMiddleware({
        target,
        agent,
        changeOrigin: true,
        ws: true,
        secure: service.protocol === 'https' ? false : undefined,
        proxyTimeout: REQUEST_TIMEOUT,
        onError: (err, req, res) => {
          sendProxyError(err, req, res, service);
        },
      });
      upgradeProxyCache.set(cacheKey, proxyMiddleware);
    }

    proxyMiddleware.upgrade(req, socket, head);
  };
}

module.exports = {
  createProxyHandler,
  createRefererProxyHandler,
  createProxyUpgradeHandler,
  rewriteProxyBody,
  sendProxyError,
  createViteClientShim,
  getSlugFromReferer,
  isLikelyRootServiceRequest,
};
