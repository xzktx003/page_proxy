<template>
  <div :class="{ dark: isDark }" class="min-h-screen">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const isDark = ref(false)

onMounted(() => {
  isDark.value = localStorage.getItem('theme') === 'dark'
  if (!localStorage.getItem('theme')) {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
})

watch(isDark, (val) => {
  localStorage.setItem('theme', val ? 'dark' : 'light')
})

// Provide theme toggle to children
import { provide } from 'vue'
provide('isDark', isDark)
provide('toggleTheme', () => { isDark.value = !isDark.value })
</script>
