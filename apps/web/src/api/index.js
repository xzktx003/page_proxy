import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Error interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout')
    } else if (error.response) {
      console.error(`API Error: ${error.response.status} ${error.response.statusText}`)
    } else if (error.request) {
      console.error('Network error: no response received')
    }
    return Promise.reject(error)
  }
)

// Retry interceptor
api.interceptors.response.use(undefined, async error => {
  const config = error.config
  if (!config || error.response?.status >= 500 || !error.request) {
    return Promise.reject(error)
  }
  if (!config._retryCount) {
    config._retryCount = 0
  }
  if (config._retryCount < 2) {
    config._retryCount++
    await new Promise(resolve => setTimeout(resolve, 1000 * config._retryCount))
    return api(config)
  }
  return Promise.reject(error)
})

// Services API
export const servicesApi = {
  list() {
    return api.get('/services').then(r => r.data.services)
  },
  get(id) {
    return api.get(`/services/${id}`).then(r => r.data.service)
  },
  create(data) {
    return api.post('/services', data).then(r => r.data.service)
  },
  update(id, data) {
    return api.put(`/services/${id}`, data).then(r => r.data.service)
  },
  delete(id) {
    return api.delete(`/services/${id}`).then(r => r.data)
  },
  reorder(orders) {
    return api.post('/services/reorder', { orders }).then(r => r.data)
  },
  checkHealth(id) {
    return api.get(`/services/${id}/check-health`).then(r => r.data.online)
  },
}

// Health API
export const healthApi = {
  getAll() {
    return api.get('/health').then(r => r.data.health)
  },
}

export default api