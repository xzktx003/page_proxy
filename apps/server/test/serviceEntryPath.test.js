const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEntryPath } = require('../src/serviceEntryPath');

test('normalizes empty service entry paths to root', () => {
  assert.equal(normalizeEntryPath(undefined), '/');
  assert.equal(normalizeEntryPath(''), '/');
  assert.equal(normalizeEntryPath('   '), '/');
});

test('accepts service entry paths with hash routes', () => {
  assert.equal(normalizeEntryPath('/ui/#/proxies'), '/ui/#/proxies');
});

test('rejects unsafe service entry paths', () => {
  assert.equal(normalizeEntryPath('http://10.30.0.22:9090/ui/'), null);
  assert.equal(normalizeEntryPath('//example.test/ui/'), null);
  assert.equal(normalizeEntryPath('/ui/\\..\\secret'), null);
  assert.equal(normalizeEntryPath(`/ui/${'x'.repeat(201)}`), null);
});
