<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasPaintStore } from '../../lib/store/canvas-paint-store.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const { brushShape, brushMode, brushSize } = storeToRefs(useCanvasPaintStore())
const store = usePipelineStore()
</script>
<template>
  <div>
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
          @click="brushMode = 'add'"
          :class="{
            'btn btn-sm': true,
            'btn-primary': brushMode === 'add',
            'btn-outline-primary': brushMode !== 'add',
          }"
          title="Add"
        >
          <span class="material-symbols-outlined">ink_highlighter</span>
        </button>
        <button
          @click="brushMode = 'remove'"
          :class="{
            'btn btn-sm': true,
            'btn-primary': brushMode === 'remove',
            'btn-outline-primary': brushMode !== 'remove',
          }"
          title="Remove"
        >
          <span class="material-symbols-outlined">ink_eraser</span>
        </button>
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
  </div>
</template>
<style lang="scss">
</style>