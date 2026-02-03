<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import ToolButton from '../../../UI/ToolButton.vue'
import { BrushSubTool, SelectSubTool, Tool } from '../../_core-editor-types.ts'
import BrushToolOptions from './ToolOptions/BrushToolOptions.vue'
import SelectToolOptions from './ToolOptions/SelectToolOptions.vue'

const store = useCanvasEditToolStore()
const { currentTool } = storeToRefs(store)
</script>
<template>
  <div class="canvas-paint-sidebar shadow-sm">
    <div class="section">
      <div class="btn-grid w-100" role="group">
        <ToolButton
          label="Brush"
          :tool="Tool.BRUSH"
          :sub-tool="BrushSubTool.ADD"
          icon="ink_highlighter"
        />
        <ToolButton
          label="Brush"
          :tool="Tool.BRUSH"
          :sub-tool="BrushSubTool.REMOVE"
          icon="ink_eraser"
        />

        <ToolButton
          label="Select"
          :tool="Tool.SELECT"
          :sub-tool="SelectSubTool.RECT"
          icon="select"
        />
        <ToolButton
          label="Select Wand"
          :tool="Tool.SELECT"
          :sub-tool="SelectSubTool.FLOOD"
          icon="wand_shine"
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