<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasPaintStore } from '../../lib/store/canvas-paint-store.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const { brushShape, brushMode, brushSize } = storeToRefs(useCanvasPaintStore())

const store = usePipelineStore()
</script>
<template>
  <div :class="{
    'canvas-paint-sidebar shadow-sm': true,
  }">
    <div class="section">
      <div class="range-label hstack mt-1 mx-auto">
        <div class="fw-medium me-1">
          <span class="material-symbols-outlined">ink_highlighter</span>
        </div>
        <div class="text-muted ms-auto">
          {{ brushSize }}px
        </div>
      </div>
      <div class="slider-wrapper mb-2">
        <input
          id="brush-size"
          type="range"
          class="form-range"
          :step="1"
          :min="1"
          :max="store.getRootNodeOutputSize().width * 1.5"
          v-model="brushSize"
        />
      </div>
    </div>
    <div class="section">
      <div class="btn-group w-100" role="group">
        <button
          @click="brushShape = 'square'"
          :class="{
            'btn btn-sm': true,
            'btn-primary': brushShape === 'square',
            'btn-outline-primary': brushShape !== 'square',
          }"
          title="Square Brush"
        >
          <span class="material-symbols-outlined">square</span>
        </button>
        <button
          @click="brushShape = 'circle'"
          :class="{
            'btn btn-sm': true,
            'btn-primary': brushShape === 'circle',
            'btn-outline-primary': brushShape !== 'circle',
          }"
          title="Circle Brush"
        >
          <span class="material-symbols-outlined">circle</span>
        </button>
      </div>
    </div>
    <div class="section">
      <div class="btn-group w-100" role="group">
        <button
          @click="brushMode = 'add'"
          :class="['btn btn-sm', brushMode === 'add' ? 'btn-primary' : 'btn-outline-primary']"
          title="Add"
        >
          <span class="material-symbols-outlined">ink_highlighter</span>
        </button>
        <button
          @click="brushMode = 'remove'"
          :class="['btn btn-sm', brushMode === 'remove' ? 'btn-primary' : 'btn-outline-primary']"
          title="Remove"
        >
          <span class="material-symbols-outlined">ink_eraser</span>
        </button>
      </div>
    </div>
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