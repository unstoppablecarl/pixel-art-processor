<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { usePipelineStore } from '../../../../lib/store/pipeline-store.ts'
import { NODE_WANG_TILE_BIT_MASK_DRAW_IMAGE } from '../../../Node/WangTile/WangTileBitMaskDraw.vue'
import ToolButton from '../../../UI/ToolButton.vue'
import { BrushSubTool, SelectSubTool, Tool } from '../../_core-editor-types.ts'
import BrushToolOptions from './ToolOptions/BrushToolOptions.vue'
import SelectToolOptions from './ToolOptions/SelectToolOptions.vue'
import TileEdgeDuplicationToolOptions from './ToolOptions/TileEdgeDuplicationToolOptions.vue'

const pipelineStore = usePipelineStore()
const store = useCanvasEditToolStore()
const { currentTool } = storeToRefs(store)

const hasTileGridNode = computed(() => pipelineStore.hasWithDef(NODE_WANG_TILE_BIT_MASK_DRAW_IMAGE))
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

      <BrushToolOptions v-if="currentTool === Tool.BRUSH" />
      <SelectToolOptions v-if="currentTool === Tool.SELECT" />

    </div>

    <TileEdgeDuplicationToolOptions v-if="hasTileGridNode" />

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
  padding: 6px 0;

  .section {
    padding: 6px 15px;

    .sub-section {
      margin: 6px 0;
    }
  }
}

.tool-sidebar-visible .canvas-paint-sidebar {
  transform: translateX(0%);
}
</style>