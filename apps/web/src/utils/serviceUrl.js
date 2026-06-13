export function normalizeEntryPath(entryPath) {
  if (typeof entryPath !== 'string' || !entryPath.trim()) return '/'
  const value = entryPath.trim()
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export function buildServiceProxyUrl(serviceOrSlug) {
  const slug = typeof serviceOrSlug === 'string' ? serviceOrSlug : serviceOrSlug?.slug
  if (!slug) return null
  const entryPath = typeof serviceOrSlug === 'string' ? '/' : normalizeEntryPath(serviceOrSlug?.entryPath)
  return `/${slug}${entryPath}`
}

export function buildServiceDirectUrl(service) {
  if (!service?.targetIp || !service?.targetPort) return null
  const protocol = service.protocol === 'https' ? 'https' : 'http'
  return `${protocol}://${service.targetIp}:${service.targetPort}${normalizeEntryPath(service.entryPath)}`
}

export function buildServiceOpenUrl(service) {
  return service?.openMode === 'direct' ? buildServiceDirectUrl(service) : buildServiceProxyUrl(service)
}
