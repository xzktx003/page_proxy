const test = require('node:test');
const assert = require('node:assert/strict');
const {
  rewriteProxyBody,
  sendProxyError,
  createViteClientShim,
  getSlugFromReferer,
  isLikelyRootServiceRequest,
} = require('../src/routes/proxy');

test('rewrites root-relative HTML and inline module references through the service slug', () => {
  const html = `<!doctype html>
<script type="module">import "/@vite/client";</script>
<link rel="icon" href="/favicon.svg">
<script type="module" src="/src/main.tsx"></script>
<a href="https://example.test/docs">external</a>`;

  const rewritten = rewriteProxyBody(html, 'text/html; charset=utf-8', 'kanban');

  assert.match(rewritten, /import "\/kanban\/@vite\/client"/);
  assert.match(rewritten, /href="\/kanban\/favicon.svg"/);
  assert.match(rewritten, /src="\/kanban\/src\/main.tsx"/);
  assert.match(rewritten, /href="https:\/\/example\.test\/docs"/);
});

test('rewrites root-relative JavaScript imports without double-prefixing existing proxy paths', () => {
const js = `import App from "/src/App.tsx";
import "/kanban/already-prefixed.js";
const image = "/assets/logo.svg";
const filenameMatch = disposition.match(/filename="(.+?)"/);
const filename = body.path.split("/").filter(Boolean).pop();
request("/api/agent-sessions");
fetch(\`${'${apiBaseUrl}'}/api/fs/download\`);
new WebSocket(\`${'${wsBase()}'}/ws/agent-sessions\`);`;

  const rewritten = rewriteProxyBody(js, 'text/javascript', 'kanban');

  assert.match(rewritten, /from "\/kanban\/src\/App\.tsx"/);
  assert.match(rewritten, /import "\/kanban\/already-prefixed\.js"/);
  assert.match(rewritten, /image = "\/assets\/logo\.svg"/);
  assert.match(rewritten, /disposition\.match\(\/filename="\(\.\+\?\)"\/\)/);
  assert.match(rewritten, /body\.path\.split\("\/"\)/);
  assert.match(rewritten, /request\("\/kanban\/api\/agent-sessions"\)/);
  assert.match(rewritten, /\$\{apiBaseUrl\}\/kanban\/api\/fs\/download/);
  assert.match(rewritten, /\$\{wsBase\(\)\}\/kanban\/ws\/agent-sessions/);
});

test('rewrites root-relative CSS urls and leaves protocol-relative urls alone', () => {
  const css = `.hero{background:url('/assets/bg.png')} .cdn{background:url("//cdn.test/x.png")}`;

  const rewritten = rewriteProxyBody(css, 'text/css', 'kanban');

  assert.match(rewritten, /url\('\/kanban\/assets\/bg\.png'\)/);
  assert.match(rewritten, /url\("\/\/cdn\.test\/x\.png"\)/);
});

test('does not rewrite JSON response bodies', () => {
  const json = JSON.stringify({
    workingDirectory: '/data01/home/xuzk/workspace/coding_kanban',
    apiPath: '/api/agent-sessions',
  });

  const rewritten = rewriteProxyBody(json, 'application/json; charset=utf-8', 'kanban');

  assert.equal(rewritten, json);
});

test('handles websocket proxy errors without calling HTTP response methods', () => {
  let destroyed = false;
  const socketLike = {
    destroy() {
      destroyed = true;
    },
  };

  assert.doesNotThrow(() => {
    sendProxyError(
      new Error('ws failed'),
      { url: '/kanban/ws/agent-sessions' },
      socketLike,
      { name: 'kanban', targetIp: '127.0.0.1', targetPort: 8484 },
    );
  });
  assert.equal(destroyed, true);
});

test('vite client shim injects and removes CSS module styles', () => {
  const shim = createViteClientShim();

  assert.match(shim, /export function updateStyle\(id, content\)/);
  assert.match(shim, /document\.createElement\('style'\)/);
  assert.match(shim, /data-vite-dev-id/);
  assert.match(shim, /style\.textContent = content/);
  assert.match(shim, /export function removeStyle\(id\)/);
  assert.match(shim, /document\.head\.removeChild\(style\)/);
});

test('extracts proxied service slug from referer URLs', () => {
  const req = {
    protocol: 'http',
    get(name) {
      if (name === 'referer') return 'http://10.30.0.22:39197/cea6d5de/ui/#/proxies';
      if (name === 'host') return '10.30.0.22:39197';
      return undefined;
    },
  };

  assert.equal(getSlugFromReferer(req), 'cea6d5de');
});

test('limits referer-based root proxying to service API paths', () => {
  assert.equal(isLikelyRootServiceRequest('/configs'), true);
  assert.equal(isLikelyRootServiceRequest('/proxies'), true);
  assert.equal(isLikelyRootServiceRequest('/providers/proxies'), true);
  assert.equal(isLikelyRootServiceRequest('/api/templates'), true);
  assert.equal(isLikelyRootServiceRequest('/assets/index.js'), false);
  assert.equal(isLikelyRootServiceRequest('/'), false);
  // Paper Agent APIs
  assert.equal(isLikelyRootServiceRequest('/api/compile'), true);
  assert.equal(isLikelyRootServiceRequest('/api/compile/full-paper'), true);
  assert.equal(isLikelyRootServiceRequest('/api/models'), true);
  assert.equal(isLikelyRootServiceRequest('/api/transfer/start'), true);
  assert.equal(isLikelyRootServiceRequest('/api/transfer/upload-pdf'), true);
  assert.equal(isLikelyRootServiceRequest('/api/ai/complete'), true);
});
