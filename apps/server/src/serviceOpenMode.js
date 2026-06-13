const OPEN_MODES = new Set(['proxy', 'direct']);

function normalizeOpenMode(value) {
  if (value === undefined || value === null || value === '') return 'proxy';
  return OPEN_MODES.has(value) ? value : null;
}

module.exports = {
  normalizeOpenMode,
};
