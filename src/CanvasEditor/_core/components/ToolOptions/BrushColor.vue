<script setup lang="ts">
import { BPopover } from 'bootstrap-vue-next'
import { type Color32, color32ToCssRGBA, color32ToCssRGBAString, type CssRGBA, cssRGBAToColor32 } from 'pixel-data-js'
import { computed } from 'vue'
import { ChromePicker } from 'vue-color'

const color = defineModel<Color32>('color', { required: true })

const tinyColorValue = computed({
  get: () => color32ToCssRGBA(color.value),
  set: (v: CssRGBA) => color.value = cssRGBAToColor32(v),
})

const colorRgba = computed(() => color32ToCssRGBAString(color.value))
</script>
<template>

  <BPopover
    placement="right"
    click
    lazy
    unmount-lazy
  >
    <template #target>
      <div
        title="Brush Color"
        class="paint-color-primary m-2 border"
        :style="`background: ${colorRgba};`">
        &nbsp;
      </div>
    </template>

    <ChromePicker v-model.tinycolor="tinyColorValue" />
  </BPopover>
</template>
<style lang="scss">
.paint-color-primary {
  cursor: pointer;
}
</style>