<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">{{ title }}</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ message }}</p>
      <div class="flex items-center justify-end gap-3">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          @click="$emit('confirm')"
          class="px-4 py-2 text-sm text-white rounded-lg transition-colors"
          :class="{
            'bg-red-600 hover:bg-red-700': confirmColor === 'red',
            'bg-primary-600 hover:bg-primary-700': confirmColor === 'blue',
          }"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  message: { type: String, required: true },
  confirmText: { type: String, default: '确认' },
  confirmColor: { type: String, default: 'blue' },
})

defineEmits(['confirm', 'cancel'])
</script>
