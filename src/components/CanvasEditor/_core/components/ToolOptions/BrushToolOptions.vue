<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasEditToolStore } from '../../../../../lib/store/canvas-edit-tool-store.ts'
import { usePipelineStore } from '../../../../../lib/store/pipeline-store.ts'
import SetValueButton from '../../../../UI/SetValueButton.vue'
import { BrushShape } from '../../_core-editor-types.ts'

const { brushShape, brushSize } = storeToRefs(useCanvasEditToolStore())
const store = usePipelineStore()
</script>
<template>
  <div class="sub-section">
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

  <div class="sub-section">
    <div class="btn-group w-100" role="group">
      <SetValueButton
        label="Square Brush"
        v-model="brushShape"
        :value="BrushShape.SQUARE"
        icon="square"
      />

      <SetValueButton
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