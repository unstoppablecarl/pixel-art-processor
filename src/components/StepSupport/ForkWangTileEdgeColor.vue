<script setup lang="ts">
import { computed, watch } from 'vue'
import { calculateChunkedArrayValidRanges } from '../../lib/util/prng/binary-array-chunks.ts'
import CheckBoxInput from '../UIForms/CheckBoxInput.vue'
import NumberInput from '../UIForms/NumberInput.vue'
import RangeBandSlider from '../UIForms/RangeBandSlider.vue'
import RangeSlider from '../UIForms/RangeSlider.vue'

const chunks = defineModel<number>('chunks', { required: true })

const minGapSize = defineModel<number>('minGapSize', { required: true })
const maxGapSize = defineModel<number>('maxGapSize', { required: true })

const minChunkSize = defineModel<number>('minChunkSize', { required: true })
const maxChunkSize = defineModel<number>('maxChunkSize', { required: true })

const padding = defineModel<number>('padding', { required: true })
const invert = defineModel<boolean>('invert', { required: true })
const shuffleSeed = defineModel<number>('shuffleSeed', { required: true })

const { size, nodeId, branchIndex } = defineProps<{
  nodeId: string,
  size: number,
  branchIndex: number
}>()

// Compute valid ranges reactively
const validRanges = computed(() => {
  return calculateChunkedArrayValidRanges(
    size,
    chunks.value,
    minGapSize.value,
    maxGapSize.value,
    minChunkSize.value,
    maxChunkSize.value,
    padding.value,
  )
})

// Clamp values when they go out of valid range
watch(validRanges, (ranges) => {
  // Clamp padding
  if (padding.value < ranges.padding.min) {
    padding.value = ranges.padding.min
  } else if (padding.value > ranges.padding.max) {
    padding.value = ranges.padding.max
  }

  // Clamp minChunkSize
  if (minChunkSize.value < ranges.minChunkSize.min) {
    minChunkSize.value = ranges.minChunkSize.min
  } else if (minChunkSize.value > ranges.minChunkSize.max) {
    minChunkSize.value = ranges.minChunkSize.max
  }

  // Clamp maxChunkSize
  if (maxChunkSize.value < ranges.maxChunkSize.min) {
    maxChunkSize.value = ranges.maxChunkSize.min
  } else if (maxChunkSize.value > ranges.maxChunkSize.max) {
    maxChunkSize.value = ranges.maxChunkSize.max
  }

  // Clamp minGapSize
  if (minGapSize.value < ranges.minGapSize.min) {
    minGapSize.value = ranges.minGapSize.min
  } else if (minGapSize.value > ranges.minGapSize.max) {
    minGapSize.value = ranges.minGapSize.max
  }

  // Clamp maxGapSize
  if (maxGapSize.value < ranges.maxGapSize.min) {
    maxGapSize.value = ranges.maxGapSize.min
  } else if (maxGapSize.value > ranges.maxGapSize.max) {
    maxGapSize.value = ranges.maxGapSize.max
  }
}, { deep: true })
</script>
<template>
    <RangeBandSlider
      :id="`${nodeId}-gap-size`"
      label="Gap Size"
      :min="validRanges.minGapSize.min"
      :max="validRanges.maxGapSize.max"
      v-model:min-value="minGapSize"
      v-model:max-value="maxGapSize"
    />

    <RangeBandSlider
      :id="`${nodeId}-chunk-size`"
      label="Chunk Size"
      :min="validRanges.minChunkSize.min"
      :max="validRanges.maxChunkSize.max"
      v-model:min-value="minChunkSize"
      v-model:max-value="maxChunkSize"
    />

    <RangeSlider
      :id="`${nodeId}-padding`"
      label="Padding"
      v-model:value="padding"
      :min="validRanges.padding.min"
      :max="validRanges.padding.max"
      :step="1"
    />

    <CheckBoxInput
      :id="`${nodeId}-invert`"
      label="Invert"
      v-model="invert"
    />

    <RangeSlider
      :id="`${nodeId}-chunks`"
      label="Chunks"
      v-model:value="chunks"
      :step="1"
      :min="validRanges.chunks.min"
      :max="validRanges.chunks.max"
    />

    <NumberInput
      :id="`${nodeId}-chunks-shuffle`"
      label="Shuffle Seed"
      :step="1"
      :min="0"
      v-model="shuffleSeed"
      input-width="50%"
    />

</template>