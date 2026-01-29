<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasPaintToolStore } from '../../../../lib/store/canvas-paint-tool-store.ts'
import { Tool } from '../../_canvas-editor-types.ts'
import ToolButton from '../../../UI/ToolButton.vue'
import BrushToolOptions from './ToolOptions/BrushToolOptions.vue'
import SelectToolOptions from './ToolOptions/SelectToolOptions.vue'

const { currentTool } = storeToRefs(useCanvasPaintToolStore())
</script>
<template>
  <div class="canvas-paint-sidebar shadow-sm">
    <div class="section">
      <div class="btn-group w-100" role="group">
        <ToolButton
          label="Brush"
          v-model="currentTool"
          :value="Tool.BRUSH"
          icon="ink_highlighter"
        />
        <ToolButton
          label="Select"
          v-model="currentTool"
          :value="Tool.SELECT"
          icon="select"
        />
      </div>
    </div>

    <BrushToolOptions v-if="currentTool === Tool.BRUSH" />
    <SelectToolOptions v-if="currentTool === Tool.SELECT" />

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

.tool-sidebar-visible .canvas-paint-sidebar {
  transform: translateX(0%);
}
</style>