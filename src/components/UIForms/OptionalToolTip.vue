<script setup lang="ts">
import { BTooltip, type BTooltipProps } from 'bootstrap-vue-next'
import { useAttrs } from 'vue'

const {
  toolTip,
} = defineProps<BTooltipProps & {
  toolTip?: string
}>()

const attrs = useAttrs()
</script>

<template>
  <BTooltip v-if="!!toolTip" v-bind="attrs">
    <template #target>
      <slot name="target" />
    </template>
    {{ toolTip }}
  </BTooltip>

  <slot v-else name="target" />
</template>
