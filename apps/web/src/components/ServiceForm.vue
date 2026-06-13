<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-white">
          {{ isEdit ? '编辑服务' : '添加服务' }}
        </h2>
        <button @click="$emit('close')" class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-4">
        <!-- Service Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            服务名称 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            maxlength="20"
            required
            placeholder="例如: 我的博客"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <p class="text-xs text-gray-400 mt-1">{{ form.name.length }}/20</p>
        </div>

        <!-- Slug (readonly in edit mode) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            服务标识
            <span v-if="isEdit" class="text-xs text-gray-400">(不可修改)</span>
          </label>
          <input
            v-model="form.slug"
            type="text"
            :readonly="isEdit"
            :disabled="isEdit"
            placeholder="留空自动生成，仅允许字母数字和连字符"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <!-- Target IP and Port -->
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              目标 IP <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.targetIp"
              type="text"
              required
              placeholder="192.168.1.100"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              端口 <span class="text-red-500">*</span>
            </label>
            <input
              v-model.number="form.targetPort"
              type="number"
              min="1"
              max="65535"
              required
              placeholder="80"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>

        <!-- Protocol and Health Check -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">协议</label>
            <select
              v-model="form.protocol"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">健康检查路径</label>
            <input
              v-model="form.healthCheckPath"
              type="text"
              placeholder="/"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>

        <!-- Entry Path -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">默认访问路径</label>
          <input
            v-model="form.entryPath"
            type="text"
            maxlength="200"
            placeholder="/"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <p class="text-xs text-gray-400 mt-1">例如 /ui/#/proxies；点击卡片和分享链接会使用该路径</p>
        </div>

        <!-- Open Mode -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">打开方式</label>
          <select
            v-model="form.openMode"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="proxy">代理嵌入</option>
            <option value="direct">直连打开</option>
          </select>
          <p class="text-xs text-gray-400 mt-1">直连打开会使用目标服务原始地址，可复用该地址下已保存的浏览器配置</p>
        </div>

        <!-- Group -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">所属分组</label>
          <div class="flex gap-2">
            <input
              v-model="form.group"
              type="text"
              placeholder="留空则归入未分组"
              list="group-options"
              class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <datalist id="group-options">
              <option v-for="g in existingGroups" :key="g" :value="g" />
            </datalist>
          </div>
        </div>

        <!-- Color Picker -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">卡片颜色</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="color in presetColors"
              :key="color"
              type="button"
              @click="form.color = color"
              class="w-7 h-7 rounded-full border-2 transition-all"
              :class="form.color === color ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
              :style="{ backgroundColor: color }"
            ></button>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">服务描述</label>
          <textarea
            v-model="form.description"
            maxlength="50"
            rows="2"
            placeholder="鼠标悬停卡片时显示 (最多50字)"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
          ></textarea>
          <p class="text-xs text-gray-400 mt-1">{{ form.description.length }}/50</p>
        </div>

        <!-- Quick Actions -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">快捷操作</label>
            <button
              type="button"
              @click="addAction"
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              + 添加操作
            </button>
          </div>
          <div v-if="form.actions.length > 0" class="space-y-2">
            <div
              v-for="(action, idx) in form.actions"
              :key="idx"
              class="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div class="flex-1 grid grid-cols-2 gap-2">
                <input
                  v-model="action.name"
                  type="text"
                  placeholder="操作名称"
                  class="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
                <select
                  v-model="action.method"
                  class="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  v-model="action.path"
                  type="text"
                  placeholder="目标路径 (如 /restart)"
                  class="col-span-2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
                <input
                  v-model="action.confirmPrompt"
                  type="text"
                  placeholder="确认提示 (可选)"
                  class="col-span-2 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <button
                type="button"
                @click="form.actions.splice(idx, 1)"
                class="p-1 text-red-400 hover:text-red-600 mt-0.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 dark:text-gray-500">暂无快捷操作</p>
        </div>

        <!-- Health check warning (add mode only) -->
        <div v-if="!isEdit && healthWarning" class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p class="text-sm text-amber-700 dark:text-amber-300">⚠️ {{ healthWarning }}</p>
          <button
            type="button"
            @click="forceAdd"
            class="mt-2 text-xs text-amber-600 dark:text-amber-400 underline"
          >
            仍然添加
          </button>
        </div>

        <!-- Error message -->
        <div v-if="errorMsg" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p class="text-sm text-red-600 dark:text-red-400">{{ errorMsg }}</p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {{ saving ? '保存中...' : (isEdit ? '保存修改' : '添加服务') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, nextTick } from 'vue'
import { servicesApi } from '../api/index.js'

const props = defineProps({
  service: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const isEdit = computed(() => !!props.service?.id)
const saving = ref(false)
const errorMsg = ref('')
const healthWarning = ref('')

const presetColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#e11d48',
]

const existingGroups = ref([])

const form = reactive({
  name: '',
  slug: '',
  targetIp: '',
  targetPort: 80,
  protocol: 'http',
  healthCheckPath: '/',
  entryPath: '/',
  openMode: 'proxy',
  color: presetColors[Math.floor(Math.random() * presetColors.length)],
  description: '',
  group: '',
  actions: [],
})

onMounted(async () => {
  // Pre-fill form if editing
  if (props.service) {
    form.name = props.service.name || ''
    form.slug = props.service.slug || ''
    form.targetIp = props.service.targetIp || ''
    form.targetPort = props.service.targetPort || 80
    form.protocol = props.service.protocol || 'http'
    form.healthCheckPath = props.service.healthCheckPath || '/'
    form.entryPath = props.service.entryPath || '/'
    form.openMode = props.service.openMode || 'proxy'
    form.color = props.service.color || presetColors[0]
    form.description = props.service.description || ''
    form.group = props.service.group || ''
    form.actions = (props.service.actions || []).map(a => ({ ...a }))
  }

  // Load existing groups
  try {
    const services = await servicesApi.list()
    const groups = new Set()
    services.forEach(s => { if (s.group) groups.add(s.group) })
    existingGroups.value = Array.from(groups)
  } catch (e) {
    // ignore
  }
})

function addAction() {
  form.actions.push({
    name: '',
    method: 'POST',
    path: '/',
    confirmPrompt: '',
  })
}

async function handleSubmit() {
  if (!form.name.trim()) { errorMsg.value = '请输入服务名称'; return }
  if (!form.targetIp.trim()) { errorMsg.value = '请输入目标IP'; return }
  if (!form.targetPort || form.targetPort < 1 || form.targetPort > 65535) {
    errorMsg.value = '端口必须在1-65535之间'; return
  }
  if (form.slug && !/^[a-zA-Z0-9-]*$/.test(form.slug)) {
    errorMsg.value = '服务标识只能包含字母、数字和连字符'; return
  }
  if (!form.entryPath.trim().startsWith('/') || form.entryPath.trim().startsWith('//') || /[\u0000-\u001F\u007F\\]/.test(form.entryPath)) {
    errorMsg.value = '默认访问路径必须以 / 开头，不能是完整 URL'; return
  }

  saving.value = true
  errorMsg.value = ''

  try {
    // Prepare data
    const data = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      targetIp: form.targetIp.trim(),
      targetPort: parseInt(form.targetPort),
      protocol: form.protocol,
      healthCheckPath: form.healthCheckPath || '/',
      entryPath: form.entryPath.trim() || '/',
      openMode: form.openMode,
      color: form.color,
      description: form.description.trim(),
      group: form.group.trim(),
      actions: form.actions.filter(a => a.name.trim()),
    }

    // If editing, include id and add targetIp/port
    if (isEdit.value) {
      data.id = props.service.id
      data.targetIp = form.targetIp.trim()
      data.targetPort = parseInt(form.targetPort)
    }

    emit('save', data)
  } catch (e) {
    errorMsg.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

function forceAdd() {
  healthWarning.value = ''
  handleSubmit()
}
</script>
