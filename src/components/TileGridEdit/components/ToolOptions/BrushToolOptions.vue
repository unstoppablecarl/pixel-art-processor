<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasPaintToolStore } from '../../../../lib/store/canvas-paint-tool-store.ts'
import { usePipelineStore } from '../../../../lib/store/pipeline-store.ts'
import ToolButton from '../../../UI/ToolButton.vue'
import { BrushMode } from '../../_canvas-editor-types.ts'

import { BrushShape } from '../../tools/brush.ts'

const { brushShape, brushMode, brushSize } = storeToRefs(useCanvasPaintToolStore())
const store = usePipelineStore()
</script>
<template>
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
        v-model.number="brushSize"
      />
    </div>
  </div>

  <div class="section">

    <div class="btn-group w-100" role="group">
      <ToolButton
        label="Add"
        v-model="brushMode"
        :value="BrushMode.ADD"
        icon="ink_highlighter"
      />
      <ToolButton
        label="Erase"
        v-model="brushMode"
        :value="BrushMode.REMOVE"
        icon="ink_eraser"
      />
    </div>
  </div>

  <div class="section">
    <div class="btn-group w-100" role="group">
      <ToolButton
        label="Square Brush"
        v-model="brushShape"
        :value="BrushShape.SQUARE"
        icon="square"
      />

      <ToolButton
        label="Circle Brush"
        v-model="brushShape"
        :value="BrushShape.CIRCLE"
        icon="circle"
      />
    </div>
  </div>
</template>
<style lang="scss">
</style>