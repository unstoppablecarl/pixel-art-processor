<script setup lang="ts">
import { useCanvasEditToolStore } from '../../../../../lib/store/canvas-edit-tool-store.ts'
import { usePipelineStore } from '../../../../../lib/store/pipeline-store.ts'

const pipelineStore = usePipelineStore()
const store = useCanvasEditToolStore()

</script>
<template>
  <div class="section border-top mt-2 pt-2">
    <div class="range-label hstack mt-1 mx-auto">
      <button
        role="button"
        class="btn btn-xs"
        :class="{
          'btn-primary': store.duplicateTileEdges,
          'btn-primary-outline': !store.duplicateTileEdges
        }"
        @click="store.duplicateTileEdges = !store.duplicateTileEdges"
      >
        <span class="material-symbols-outlined">border_style</span>
      </button>
      <div class="text-muted ms-auto">
        {{ store.duplicateTileEdgesBorderThickness }}px
      </div>
    </div>
    <div class="slider-wrapper mb-2">
      <input
        id="brush-size"
        type="range"
        class="form-range"
        :step="1"
        :min="1"
        :max="pipelineStore.getRootNodeOutputSize().width * 0.5"
        :disabled="!store.duplicateTileEdges"
        v-model.number="store.duplicateTileEdgesBorderThickness"
      />
    </div>
  </div>
</template>
<style lang="scss">
</style>