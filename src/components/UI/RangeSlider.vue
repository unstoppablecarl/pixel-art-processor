<script setup lang="ts" generic="T extends RangeSliderSettings">
import type { RangeSliderSettings } from './RangeSlider.ts'
import RangeSliderRaw from './RangeSliderRaw.vue'

const group = defineModel<RangeSliderSettings>({ required: true })

const props = defineProps<{
  id: string
  label: string
  decimals?: number
  expandStep?: number
  expandDelay?: number
  defaults: RangeSliderSettings
}>()
</script>
<template>
  <RangeSliderRaw
    :id="props.id"
    :label="props.label"
    :decimals="props.decimals"
    :expand-step="props.expandStep"
    :expand-delay="props.expandDelay"
    :defaults="props.defaults"
    v-model:min.number="group.min"
    v-model:max.number="group.max"
    v-model:step.number="group.step"
    v-model:value.number="group.value"
  />
</template>
