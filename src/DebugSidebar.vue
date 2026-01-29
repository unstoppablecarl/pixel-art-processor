<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useUIStore } from './lib/store/ui-store.ts'
import { useDebugSidebar } from './lib/vue/debug-sidebar.ts'

const store = useUIStore()
const debug = useDebugSidebar()
const canvasRef = useTemplateRef('canvasRef')

const data = debug.data

onMounted(() => {
  debug.setCanvas(canvasRef.value!)
})
</script>
<template>
  <div class="sidebar-container" :class="{ hidden: !store.debugSidebarVisible }">
    <button
      :class="{
        'btn sidebar-toggle': true,
        'btn-primary': !store.debugSidebarVisible,
        'btn-secondary': store.debugSidebarVisible
      }"
      @click="store.debugSidebarVisible= !store.debugSidebarVisible"
    >
      <span class="arrow">{{ store.debugSidebarVisible ? '›' : '‹' }}</span>
    </button>
    <div class="sidebar-content">
      <div><small>Debug Sidebar</small></div>
      <div v-for="(item, key) in data">
        <strong>{{ key }}:</strong> {{ item }}
      </div>
      <canvas
        ref="canvasRef"
        id="debug-canvas"
        class="debug-canvas"
      >
      </canvas>
    </div>
  </div>
</template>
<style lang="scss">

.sidebar-container {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 1050;
  transition: transform 0.3s ease-in-out;

  .sidebar-toggle {
    position: absolute;
    left: -20px;
    bottom: -15px;
    transform: translateY(-50%);
    width: 20px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-bottom-right-radius: 0;
    border-top-right-radius: 0;
    opacity: 0.5;
  }
}

.sidebar-content {
  width: 300px;
  height: 400px;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  padding: 10px;
  overflow-y: auto;
  border-radius: 8px 0 0 8px;
  --bs-bg-opacity: 1;
  background-color: rgba(var(--bs-dark-rgb), var(--bs-bg-opacity)) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* When sidebar is hidden */
.sidebar-container.hidden {
  transform: translateX(300px);
}

.arrow {
  font-size: 20px;
  font-weight: bold;
}

</style>