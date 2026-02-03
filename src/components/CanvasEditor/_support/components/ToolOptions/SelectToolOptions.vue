<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasEditToolStore } from '../../../../../lib/store/canvas-edit-tool-store.ts'
import SetValueButton from '../../../../UI/SetValueButton.vue'
import { BlendMode, DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK, SelectSubTool } from '../../../_core-editor-types.ts'

const dataAttr = DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK
const { selectMoveBlendMode, selectFloodContiguous, currentSubTool } = storeToRefs(useCanvasEditToolStore())
</script>
<template>
  <div class="section d-flex section-tools">
    <div class="btn-group-vertical">
      <SetValueButton
        label="Overwrite"
        v-model="selectMoveBlendMode"
        :value="BlendMode.OVERWRITE"
        icon="shadow"
        v-bind:[dataAttr]="true"
      />
      <SetValueButton
        label="Ignore Transparent"
        v-model="selectMoveBlendMode"
        :value="BlendMode.IGNORE_TRANSPARENT"
        icon="shadow_add"
        v-bind:[dataAttr]="true"
      />
      <SetValueButton
        label="Ignore Solid"
        v-model="selectMoveBlendMode"
        :value="BlendMode.IGNORE_SOLID"
        icon="shadow_minus"
        v-bind:[dataAttr]="true"
      />
    </div>
    <div class="btn-group-vertical" v-if="currentSubTool === SelectSubTool.FLOOD">
      <SetValueButton
        label="Contiguous"
        v-model="selectFloodContiguous"
        :value="!selectFloodContiguous"
        :selected="selectFloodContiguous"
        icon="low_density"
        v-bind:[dataAttr]="true"
      />
    </div>
  </div>
</template>
<style lang="scss">
.section-tools {
  gap: 2px;
  margin-left: -1px;
}
</style>