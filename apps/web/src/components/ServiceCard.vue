<template>
  <div
    class="card-handle card-hover bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer relative group"
    @click="$emit('click')"
  >
    <!-- Action buttons (top right, visible on hover) -->
    <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <button
        @click.stop="$emit('edit', service)"
        class="p-1.5 rounded-md bg-white/80 dark:bg-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
        title="编辑"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        @click.stop="$emit('delete', service)"
        class="p-1.5 rounded-md bg-white/80 dark:bg-gray-700/80 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
        title="删除"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Icon / Avatar -->
    <div class="flex items-center gap-3 mb-3">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
        :style="{ backgroundColor: service.color || defaultColor }"
      >
        <img v-if="service.icon" :src="service.icon" class="w-full h-full object-cover rounded-lg" />
        <span v-else>{{ service.name.charAt(0).toUpperCase() }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-semibold text-gray-800 dark:text-white truncate">{{ service.name }}</h3>
        <p v-if="service.description" class="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5" :title="service.description">
          {{ service.description }}
        </p>
      </div>
    </div>

    <!-- Status -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <span
          class="w-2 h-2 rounded-full"
          :class="{
            'bg-green-500': service.online === true,
            'bg-red-400': service.online === false,
            'bg-gray-300 dark:bg-gray-600': service.online == null,
          }"
        ></span>
        <span class="text-xs" :class="{
          'text-green-600 dark:text-green-400': service.online === true,
          'text-red-500 dark:text-red-400': service.online === false,
          'text-gray-400 dark:text-gray-500': service.online == null,
        }">
          {{ service.online === true ? '在线' : service.online === false ? '离线' : '未知' }}
        </span>
      </div>

      <!-- Group tag -->
      <span v-if="service.group" class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
        {{ service.group }}
      </span>
    </div>

    <!-- Quick Actions -->
    <div v-if="service.actions && service.actions.length > 0" class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-1.5">
      <button
        v-for="action in service.actions"
        :key="action.name"
        @click.stop="$emit('action', { service, action })"
        class="px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-md transition-colors"
        :title="action.confirmPrompt || action.name"
      >
        {{ action.name }}
      </button>
    </div>

    <!-- Share (bottom right) -->
    <button
      @click.stop="$emit('share', service)"
      class="absolute bottom-3 right-3 p-1.5 rounded-md text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
      title="复制分享链接"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  service: { type: Object, required: true },
})

defineEmits(['click', 'edit', 'delete', 'share', 'action'])

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
const defaultColor = colors[Math.floor(Math.random() * colors.length)]
</script>
