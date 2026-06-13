<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-14">
          <div class="flex items-center gap-3">
            <span class="text-xl">📦</span>
            <h1 class="text-lg font-semibold text-gray-800 dark:text-white">服务代理工作台</h1>
          </div>
          <div class="flex items-center gap-3">
            <button @click="toggleTheme" class="theme-toggle p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" :title="isDark ? '切换到浅色模式' : '切换到深色模式'">
              {{ isDark ? '☀️' : '🌙' }}
            </button>
            <button @click="openAddForm" class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
              <span>+</span>
              <span class="hidden sm:inline">添加服务</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <GroupFilter :groups="allGroups" :active-group="activeGroup" @select="activeGroup = $event" />
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div v-if="services.length === 0" class="text-center py-20">
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">还没有添加任何服务</h3>
        <p class="text-sm text-gray-400 dark:text-gray-500 mb-6">点击右上角"添加服务"来开始使用</p>
        <button @click="openAddForm" class="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <span>+</span> 添加第一个服务
        </button>
      </div>

      <div v-else-if="filteredServices.length === 0" class="text-center py-20">
        <div class="text-5xl mb-4">🔍</div>
        <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">该分组下暂无服务</h3>
        <p class="text-sm text-gray-400 dark:text-gray-500">尝试切换其他分组查看</p>
      </div>

      <draggable v-else v-model="sortableServices" item-key="id" handle=".card-handle"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        ghost-class="sortable-ghost" chosen-class="sortable-chosen" @end="onDragEnd">
        <template #item="{ element: service }">
          <ServiceCard :service="service" @click="openEmbed(service)" @edit="editService($event)"
            @delete="confirmDelete($event)" @share="shareService($event)" @action="executeAction($event)" />
        </template>
      </draggable>
    </div>

    <ServiceForm v-if="formMode" :service="editingService" @close="closeForm" @save="handleSave" />

    <ConfirmDialog v-if="deletingService" :title="`删除服务 '${deletingService.name}'`"
      message="删除后该服务的代理路由将立即失效，确定要删除吗？" confirm-text="删除" confirm-color="red"
      @confirm="handleDelete" @cancel="deletingService = null" />

    <Transition name="toast">
      <div v-if="toast" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
        :class="{ 'bg-green-600 text-white': toast.type === 'success', 'bg-red-600 text-white': toast.type === 'error', 'bg-blue-600 text-white': toast.type === 'info' }">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { servicesApi } from '../api/index.js'
import { buildServiceOpenUrl } from '../utils/serviceUrl.js'
import ServiceCard from '../components/ServiceCard.vue'
import ServiceForm from '../components/ServiceForm.vue'
import GroupFilter from '../components/GroupFilter.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()
const isDark = inject('isDark')
const toggleTheme = inject('toggleTheme')

const services = ref([])
const editingService = ref(null)
const deletingService = ref(null)
const activeGroup = ref('')
const toast = ref(null)
let healthInterval = null

const formMode = computed(() => editingService.value !== null)

function openAddForm() {
  editingService.value = { _isNew: true }
}
function editService(s) {
  editingService.value = { ...s }
}
function closeForm() {
  editingService.value = null
}

const allGroups = computed(() => {
  const g = new Set()
  services.value.forEach(s => { if (s.group) g.add(s.group) })
  return Array.from(g).sort()
})
const filteredServices = computed(() => {
  let list = services.value
  if (activeGroup.value) list = list.filter(s => s.group === activeGroup.value)
  return [...list].sort((a, b) => (a.sort || 0) - (b.sort || 0))
})
const sortableServices = computed({
  get: () => filteredServices.value,
  set: (val) => { val.forEach((item, idx) => { const svc = services.value.find(s => s.id === item.id); if (svc) svc.sort = idx }) }
})

async function onDragEnd() {
  try {
    const orders = services.value.filter(s => !activeGroup.value || s.group === activeGroup.value).map((s, idx) => ({ id: s.id, sort: idx }))
    await servicesApi.reorder(orders)
  } catch (e) { showToast('排序保存失败', 'error') }
}

async function loadServices() {
  try { services.value = await servicesApi.list() } catch (e) { showToast('加载服务列表失败', 'error') }
}

function showToast(message, type = 'success') { toast.value = { message, type }; setTimeout(() => { toast.value = null }, 3000) }
function openEmbed(service) {
  if (service.openMode === 'direct') {
    window.location.href = buildServiceOpenUrl(service)
    return
  }
  router.push({ name: 'embed', params: { slug: service.slug } })
}
function confirmDelete(service) { deletingService.value = service }

async function handleSave(formData) {
  try {
    if (formData.id) { await servicesApi.update(formData.id, formData); showToast('服务已更新', 'success') }
    else { await servicesApi.create(formData); showToast('服务已添加', 'success') }
    closeForm()
    await loadServices()
  } catch (e) { showToast(e.response?.data?.error || '操作失败', 'error') }
}

async function handleDelete() {
  if (!deletingService.value) return
  try { await servicesApi.delete(deletingService.value.id); showToast('服务已删除', 'success'); deletingService.value = null; await loadServices() }
  catch (e) { showToast('删除失败', 'error') }
}

function shareService(service) {
  const openUrl = buildServiceOpenUrl(service)
  const url = service.openMode === 'direct' ? openUrl : `${window.location.origin}${openUrl}`
  navigator.clipboard.writeText(url).then(() => showToast('链接已复制到剪贴板', 'info')).catch(() => showToast(`分享链接: ${url}`, 'info'))
}

async function executeAction({ service, action }) {
  if (action.confirmPrompt && !confirm(action.confirmPrompt)) return
  try {
    const r = await fetch(`/${service.slug}${action.path}`, { method: action.method || 'POST' })
    showToast(r.ok ? `${action.name} 执行成功` : `${action.name} 执行失败: ${r.status}`, r.ok ? 'success' : 'error')
  } catch (e) { showToast(`${action.name} 执行失败: ${e.message}`, 'error') }
}

async function pollHealth() {
  try { const h = await servicesApi.list(); services.value = services.value.map(s => { const x = h.find(i => i.id === s.id); return x ? { ...s, online: x.online, lastCheck: x.lastCheck } : s }) } catch (e) {}
}

onMounted(async () => { await loadServices(); healthInterval = setInterval(pollHealth, 30000) })
onUnmounted(() => { if (healthInterval) clearInterval(healthInterval) })
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(20px); }
</style>
