const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.join(__dirname, '../../../config/services.json');
const BACKUP_PATH = path.join(__dirname, '../../../config/services.json.bak');

let _services = [];
let _configMtime = null;
let _watcher = null;

/**
 * Initialize config store: load from file or create default
 */
function initConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const data = JSON.parse(raw);
      _services = Array.isArray(data) ? data : (data.services || []);
      _configMtime = fs.statSync(CONFIG_PATH).mtimeMs;
      _startFileWatcher();
      console.log(`[ConfigStore] Loaded ${_services.length} services from config`);
    } else {
      _services = [];
      _configMtime = Date.now();
      _save();
      console.log('[ConfigStore] Created default empty config');
    }
  } catch (err) {
    console.error('[ConfigStore] Failed to load config, attempting backup recovery:', err.message);
    _tryRecoverFromBackup();
  }
}

function _startFileWatcher() {
  if (_watcher) return;
  try {
    _watcher = fs.watch(CONFIG_PATH, (eventType) => {
      if (eventType === 'change') {
        console.log('[ConfigStore] Config file changed, reloading...');
        initConfig();
      }
    });
  } catch (err) {
    console.warn('[ConfigStore] File watcher not available:', err.message);
  }
}

/**
 * Get all services
 */
function getServices() {
  return _services;
}

/**
 * Get a service by slug
 */
function getServiceBySlug(slug) {
  return _services.find(s => s.slug === slug) || null;
}

/**
 * Get a service by id
 */
function getServiceById(id) {
  return _services.find(s => s.id === id) || null;
}

/**
 * Add a new service
 */
function addService(service) {
  // Generate slug if not provided
  if (!service.slug) {
    service.slug = service.id;
  }
  // Ensure unique slug
  let baseSlug = service.slug;
  let counter = 1;
  while (_services.some(s => s.slug === service.slug)) {
    service.slug = `${baseSlug}-${counter}`;
    counter++;
  }
  // Set sort to end of list
  service.sort = _services.length;
  _services.push(service);
  _save();
  return service;
}

/**
 * Update a service by id
 */
function updateService(id, updates) {
  const idx = _services.findIndex(s => s.id === id);
  if (idx === -1) return null;
  // slug is immutable
  delete updates.slug;
  delete updates.id;
  _services[idx] = { ..._services[idx], ...updates };
  _save();
  return _services[idx];
}

/**
 * Delete a service by id
 */
function deleteService(id) {
  const idx = _services.findIndex(s => s.id === id);
  if (idx === -1) return false;
  _services.splice(idx, 1);
  _save();
  return true;
}

/**
 * Reorder services (accepts array of { id, sort })
 */
function reorderServices(orders) {
  for (const order of orders) {
    const svc = _services.find(s => s.id === order.id);
    if (svc) svc.sort = order.sort;
  }
  _services.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  _save();
}

/**
 * Update health status for a service
 */
function updateHealthStatus(slug, online) {
  const svc = _services.find(s => s.slug === slug);
  if (svc) {
    svc.online = online;
    svc.lastCheck = new Date().toISOString();
    // Don't save health status to file (transient state)
  }
}

/**
 * Generate a UUID
 */
function generateId() {
  return crypto.randomUUID();
}

/**
 * Save config to file with backup
 */
function _save() {
  try {
    // Backup current config
    if (fs.existsSync(CONFIG_PATH)) {
      fs.copyFileSync(CONFIG_PATH, BACKUP_PATH);
    }
    const data = { services: _services };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ConfigStore] Failed to save config:', err.message);
  }
}

/**
 * Try to recover from backup
 */
function _tryRecoverFromBackup() {
  try {
    if (fs.existsSync(BACKUP_PATH)) {
      const raw = fs.readFileSync(BACKUP_PATH, 'utf-8');
      const data = JSON.parse(raw);
      _services = Array.isArray(data) ? data : (data.services || []);
      _save(); // Restore main config
      console.log(`[ConfigStore] Recovered ${_services.length} services from backup`);
    } else {
      _services = [];
      _save();
      console.log('[ConfigStore] No backup found, initialized empty config');
    }
  } catch (err) {
    console.error('[ConfigStore] Backup recovery also failed:', err.message);
    _services = [];
  }
}

module.exports = {
  initConfig,
  getServices,
  getServiceBySlug,
  getServiceById,
  addService,
  updateService,
  deleteService,
  reorderServices,
  updateHealthStatus,
  generateId,
};
