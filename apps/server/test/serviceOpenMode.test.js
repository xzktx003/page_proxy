const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOpenMode } = require('../src/serviceOpenMode');

test('normalizes missing service open mode to proxy', () => {
  assert.equal(normalizeOpenMode(undefined), 'proxy');
  assert.equal(normalizeOpenMode(null), 'proxy');
  assert.equal(normalizeOpenMode(''), 'proxy');
});

test('accepts known service open modes', () => {
  assert.equal(normalizeOpenMode('proxy'), 'proxy');
  assert.equal(normalizeOpenMode('direct'), 'direct');
});

test('rejects unknown service open modes', () => {
  assert.equal(normalizeOpenMode('iframe'), null);
  assert.equal(normalizeOpenMode('http://10.30.0.22:9090/ui/'), null);
});
