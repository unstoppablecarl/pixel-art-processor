<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCanvasPaintStore } from '../../../../lib/store/canvas-paint-store.ts'
import ToolButton from '../../../UI/ToolButton.vue'
import { SelectMoveBlendMode } from '../../tools/select.ts'

const { selectMoveBlendMode } = storeToRefs(useCanvasPaintStore())
</script>
<template>
  <div class="section">
    <div class="btn-group-vertical">
      <ToolButton
        label="Overwrite"
        v-model="selectMoveBlendMode"
        :value="SelectMoveBlendMode.OVERWRITE"
        icon="shadow"
      />
      <ToolButton
        label="Ignore Transparent"
        v-model="selectMoveBlendMode"
        :value="SelectMoveBlendMode.IGNORE_TRANSPARENT"
        icon="shadow_add"
      />
      <ToolButton
        label="Ignore Solid"
        v-model="selectMoveBlendMode"
        :value="SelectMoveBlendMode.IGNORE_SOLID"
        icon="shadow_minus"
      />
    </div>
  </div>
</template>
<style lang="scss">
</style>