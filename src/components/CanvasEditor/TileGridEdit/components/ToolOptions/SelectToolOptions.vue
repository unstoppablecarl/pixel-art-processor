<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasPaintToolStore } from '../../../../../lib/store/canvas-paint-tool-store.ts'
import { BlendMode, DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK } from '../../../_canvas-editor-types.ts'
import ToolButton from '../../../../UI/ToolButton.vue'

const dataAttr = DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK
const { selectMoveBlendMode } = storeToRefs(useCanvasPaintToolStore())
</script>
<template>
  <div class="section">
    <div class="btn-group-vertical">
      <ToolButton
        label="Overwrite"
        v-model="selectMoveBlendMode"
        :value="BlendMode.OVERWRITE"
        icon="shadow"
        v-bind:[dataAttr]="true"
      />
      <ToolButton
        label="Ignore Transparent"
        v-model="selectMoveBlendMode"
        :value="BlendMode.IGNORE_TRANSPARENT"
        icon="shadow_add"
        v-bind:[dataAttr]="true"
      />
      <ToolButton
        label="Ignore Solid"
        v-model="selectMoveBlendMode"
        :value="BlendMode.IGNORE_SOLID"
        icon="shadow_minus"
        v-bind:[dataAttr]="true"
      />
    </div>
  </div>
</template>
<style lang="scss">
</style>