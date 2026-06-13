const express = require('express');
const router = express.Router();
// JSON body parsing for API routes only (must not be global to avoid consuming proxied request bodies)
router.use(express.json());
const {
  getServices,
  getServiceById,
  getServiceBySlug,
  addService,
  updateService,
  deleteService,
  reorderServices,
  generateId,
} = require('../configStore');
const { normalizeEntryPath } = require('../serviceEntryPath');
const { normalizeOpenMode } = require('../serviceOpenMode');

/**
 * GET /api/services
 * List all services
 */
router.get('/', (req, res) => {
  const services = getServices().sort((a, b) => (a.sort || 0) - (b.sort || 0));
  res.json({ services });
});

/**
 * GET /api/services/:id
 * Get a single service by id
 */
router.get('/:id', (req, res) => {
  const service = getServiceById(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json({ service });
});

/**
 * POST /api/services
 * Add a new service
 */
router.post('/', (req, res) => {
  const {
    name, slug: userSlug, targetIp, targetPort, protocol,
    healthCheckPath, entryPath, openMode, icon, color, description, group, actions,
  } = req.body;

  // Validation
  if (!name || !name.trim()) return res.status(400).json({ error: 'Service name is required' });
  if (name.length > 20) return res.status(400).json({ error: 'Service name must be 20 characters or less' });
  if (!targetIp) return res.status(400).json({ error: 'Target IP is required' });
  if (!targetPort || targetPort < 1 || targetPort > 65535) return res.status(400).json({ error: 'Target port must be 1-65535' });
  if (protocol && !['http', 'https'].includes(protocol)) return res.status(400).json({ error: 'Protocol must be http or https' });
  if (description && description.length > 50) return res.status(400).json({ error: 'Description must be 50 characters or less' });
  const normalizedEntryPath = normalizeEntryPath(entryPath);
  if (normalizedEntryPath === null) return res.status(400).json({ error: 'Entry path must start with / and be 200 characters or less' });
  const normalizedOpenMode = normalizeOpenMode(openMode);
  if (normalizedOpenMode === null) return res.status(400).json({ error: 'Open mode must be proxy or direct' });

  // Validate slug format
  const slugRegex = /^[a-zA-Z0-9-]*$/;
  const slug = userSlug && userSlug.trim() ? userSlug.trim() : generateId().slice(0, 8);
  if (!slugRegex.test(slug)) return res.status(400).json({ error: 'Slug must contain only letters, numbers, and hyphens' });

  // Check slug uniqueness
  if (getServiceBySlug(slug)) {
    return res.status(400).json({ error: 'Service identifier already exists' });
  }

  const service = {
    id: generateId(),
    slug,
    name: name.trim(),
    targetIp: targetIp.trim(),
    targetPort: parseInt(targetPort, 10),
    protocol: protocol || 'http',
    healthCheckPath: healthCheckPath || '/',
    entryPath: normalizedEntryPath,
    openMode: normalizedOpenMode,
    icon: icon || null,
    color: color || null,
    description: (description || '').trim(),
    group: (group || '').trim(),
    actions: Array.isArray(actions) ? actions : [],
    online: null,
    lastCheck: null,
    createdAt: new Date().toISOString(),
  };

  const created = addService(service);
  res.status(201).json({ service: created });
});

/**
 * PUT /api/services/:id
 * Update a service
 */
router.put('/:id', (req, res) => {
  const {
    name, targetIp, targetPort, protocol,
    healthCheckPath, entryPath, openMode, icon, color, description, group, actions, sort,
  } = req.body;

  // Validation
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Service name cannot be empty' });
    if (name.length > 20) return res.status(400).json({ error: 'Service name must be 20 characters or less' });
  }
  if (targetPort !== undefined && (targetPort < 1 || targetPort > 65535)) {
    return res.status(400).json({ error: 'Target port must be 1-65535' });
  }
  if (protocol !== undefined && !['http', 'https'].includes(protocol)) {
    return res.status(400).json({ error: 'Protocol must be http or https' });
  }
  if (description !== undefined && description.length > 50) {
    return res.status(400).json({ error: 'Description must be 50 characters or less' });
  }
  const normalizedEntryPath = entryPath !== undefined ? normalizeEntryPath(entryPath) : undefined;
  if (normalizedEntryPath === null) return res.status(400).json({ error: 'Entry path must start with / and be 200 characters or less' });
  const normalizedOpenMode = openMode !== undefined ? normalizeOpenMode(openMode) : undefined;
  if (normalizedOpenMode === null) return res.status(400).json({ error: 'Open mode must be proxy or direct' });

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (targetIp !== undefined) updates.targetIp = targetIp.trim();
  if (targetPort !== undefined) updates.targetPort = parseInt(targetPort, 10);
  if (protocol !== undefined) updates.protocol = protocol;
  if (healthCheckPath !== undefined) updates.healthCheckPath = healthCheckPath || '/';
  if (entryPath !== undefined) updates.entryPath = normalizedEntryPath;
  if (openMode !== undefined) updates.openMode = normalizedOpenMode;
  if (icon !== undefined) updates.icon = icon;
  if (color !== undefined) updates.color = color;
  if (description !== undefined) updates.description = description.trim();
  if (group !== undefined) updates.group = group.trim();
  if (actions !== undefined) updates.actions = Array.isArray(actions) ? actions : [];
  if (sort !== undefined) updates.sort = sort;

  const updated = updateService(req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Service not found' });
  res.json({ service: updated });
});

/**
 * DELETE /api/services/:id
 * Delete a service
 */
router.delete('/:id', (req, res) => {
  const deleted = deleteService(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Service not found' });
  res.json({ success: true });
});

/**
 * POST /api/services/reorder
 * Reorder services
 */
router.post('/reorder', (req, res) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders must be an array' });
  reorderServices(orders);
  res.json({ success: true });
});

/**
 * GET /api/services/:id/check-health
 * Manually trigger health check for a service
 */
router.get('/:id/check-health', async (req, res) => {
  const service = getServiceById(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const { checkHealth } = require('../healthCheck');
  const online = await checkHealth(service);
  res.json({ online });
});

module.exports = router;
