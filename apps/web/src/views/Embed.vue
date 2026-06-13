<template>
  <div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
    <!-- Top Navigation Bar -->
    <nav class="flex-shrink-0 h-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 z-50">
      <button
        @click="goHome"
        class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="返回首页"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span class="hidden sm:inline">首页</span>
      </button>

      <div class="h-5 w-px bg-gray-300 dark:bg-gray-600"></div>
      <span class="text-sm font-medium text-gray-800 dark:text-white truncate">{{ currentService?.name || slug }}</span>
      <span v-if="currentService?.online === true" class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
      </span>
      <span v-else-if="currentService?.online === false" class="inline-flex items-center gap-1 text-xs text-red-500">
        <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
      </span>

      <div class="flex-1"></div>

      <!-- Service Switcher -->
      <div class="relative" ref="dropdownRef">
        <button
          @click="showDropdown = !showDropdown"
          class="flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
        >
          <span>切换服务</span>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <Transition name="dropdown">
          <div v-if="showDropdown" class="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
            <button
              v-for="s in allServices"
              :key="s.id"
              @click="switchService(s)"
              class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              :class="{ 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300': s.slug === slug }"
            >
              <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :class="s.online ? 'bg-green-500' : s.online === false ? 'bg-red-400' : 'bg-gray-300'"
              ></span>
              <span class="truncate">{{ s.name }}</span>
            </button>
          </div>
        </Transition>
      </div>

      <button @click="shareLink" class="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors" title="复制分享链接">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      <button @click="toggleFullscreen" class="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors" title="全屏">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </nav>

    <!-- Content Area -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Iframe -->
      <iframe
        v-if="proxyUrl"
        :src="proxyUrl"
        class="w-full h-full border-0"
        ref="iframeRef"
        @load="onIframeLoad"
        @error="onIframeError"
      ></iframe>

      <!-- Loading indicator -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
        <div class="text-center">
          <div class="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-sm text-gray-500 dark:text-gray-400">正在加载服务...</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">{{ proxyUrl }}</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
        <div class="text-center max-w-md mx-4">
          <div class="text-5xl mb-4">⚠️</div>
          <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">无法加载服务</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ error }}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">目标: {{ currentService?.protocol }}://{{ currentService?.targetIp }}:{{ currentService?.targetPort }}</p>
          <button @click="retry" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
            重试
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { servicesApi } from '../api/index.js'
import { buildServiceDirectUrl, buildServiceProxyUrl } from '../utils/serviceUrl.js'

const router = useRouter()
const route = useRoute()

const slug = computed(() => route.params.slug)
const allServices = ref([])
const currentService = ref(null)
const proxyUrl = computed(() => {
  if (!currentService.value || currentService.value.slug !== slug.value) return null
  return buildServiceProxyUrl(currentService.value)
})
const showDropdown = ref(false)
const loading = ref(true)
const error = ref(null)
const iframeRef = ref(null)
const dropdownRef = ref(null)

function goHome() {
  router.push({ name: 'home' })
}

async function loadServices() {
  try {
    allServices.value = await servicesApi.list()
    currentService.value = allServices.value.find(s => s.slug === slug.value)
    if (!currentService.value) {
      error.value = `服务 "${slug.value}" 不存在`
      loading.value = false
    }
  } catch (e) {
    console.error('Failed to load services:', e)
  }
}

function switchService(service) {
  showDropdown.value = false
  if (service.slug !== slug.value) {
    if (service.openMode === 'direct') {
      window.location.href = buildServiceDirectUrl(service)
      return
    }
    loading.value = true
    error.value = null
    currentService.value = null
    router.push({ name: 'embed', params: { slug: service.slug } })
  }
}

function onIframeLoad() {
  loading.value = false
  error.value = null
}

function onIframeError() {
  loading.value = false
  error.value = 'iframe 加载失败'
}

function retry() {
  loading.value = true
  error.value = null
  const iframe = iframeRef.value
  if (iframe) {
    iframe.src = ''
    setTimeout(() => { iframe.src = proxyUrl.value }, 100)
  }
}

function shareLink() {
  const url = `${window.location.origin}${proxyUrl.value}`
  navigator.clipboard.writeText(url).then(() => {
    alert('链接已复制到剪贴板')
  }).catch(() => {
    alert(`分享链接: ${url}`)
  })
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}

// Watch for slug changes (when switching services)
watch(slug, () => {
  loading.value = true
  error.value = null
  currentService.value = null
  loadServices()
})

onMounted(async () => {
  await loadServices()
  document.addEventListener('click', handleClickOutside)
  // Safety timeout - if iframe doesn't fire load event within 10s, hide loading
  setTimeout(() => {
    if (loading.value) {
      loading.value = false
    }
  }, 10000)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active, .dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
