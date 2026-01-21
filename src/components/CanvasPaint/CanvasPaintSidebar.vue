<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasPaintStore } from '../../lib/store/canvas-paint-store.ts'
import BrushToolOptions from './BrushToolOptions.vue'
import { Tool } from './renderer.ts'

const { currentTool } = storeToRefs(useCanvasPaintStore())

</script>
<template>
  <div :class="{
    'canvas-paint-sidebar shadow-sm': true,
  }">

    <div class="section">
      <div class="btn-group w-100" role="group">
        <button
          @click="currentTool = Tool.BRUSH"
          :class="{
            'btn btn-sm': true,
            'btn-primary': currentTool === Tool.BRUSH,
            'btn-outline-primary': currentTool !== Tool.BRUSH,
          }"
          title="Brush"
        >
          <span class="material-symbols-outlined">ink_highlighter</span>
        </button>
        <button
          @click="currentTool = Tool.SELECT"
          :class="{
            'btn btn-sm': true,
            'btn-primary': currentTool === Tool.SELECT,
            'btn-outline-primary': currentTool !== Tool.SELECT,
          }"
          title="Select"
        >
          <span class="material-symbols-outlined">select</span>
        </button>
      </div>

    </div>

    <BrushToolOptions v-if="currentTool === Tool.BRUSH" />

  </div>
</template>
<style lang="scss">
.canvas-paint-sidebar {
  --bs-bg-opacity: 1;
  background-color: rgba(var(--bs-dark-rgb), var(--bs-bg-opacity)) !important;
  top: var(--navbar-height);
  left: 0;
  width: var(--canvas-paint-sidebar-width);
  height: 300px;
  position: fixed;
  z-index: 20;
  border-radius: 0 0 var(--bs-border-radius) 0;
  transition: transform var(--sidebar-transition-time) ease-in-out;
  transform: translateX(-100%);
  padding: 15px;

  .section {
    margin: 0 0 6px;
  }
}

.sidebar-visible .canvas-paint-sidebar {
  transform: translateX(0%);
}
</style>