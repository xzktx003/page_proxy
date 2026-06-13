function normalizeEntryPath(value) {
  const entryPath = typeof value === 'string' && value.trim() ? value.trim() : '/';
  if (
    entryPath.length > 200 ||
    !entryPath.startsWith('/') ||
    entryPath.startsWith('//') ||
    /[\u0000-\u001F\u007F\\]/.test(entryPath)
  ) {
    return null;
  }
  return entryPath;
}

module.exports = {
  normalizeEntryPath,
};
