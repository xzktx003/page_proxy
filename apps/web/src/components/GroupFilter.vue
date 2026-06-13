<template>
  <div class="flex items-center gap-2 overflow-x-auto pb-1">
    <button
      @click="$emit('select', '')"
      class="px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex-shrink-0"
      :class="activeGroup === ''
        ? 'bg-primary-600 text-white'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'"
    >
      全部服务
    </button>
    <button
      v-for="group in groups"
      :key="group"
      @click="$emit('select', group)"
      class="px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex-shrink-0"
      :class="activeGroup === group
        ? 'bg-primary-600 text-white'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'"
    >
      {{ group }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  groups: { type: Array, default: () => [] },
  activeGroup: { type: String, default: '' },
})

defineEmits(['select'])
</script>
