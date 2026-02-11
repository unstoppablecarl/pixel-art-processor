<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasEditToolStore } from '../../lib/store/canvas-edit-tool-store.ts'
import type { AnySubTool, Tool } from '../CanvasEditor/_core/_core-editor-types.ts'

const store = useCanvasEditToolStore()

const {
  label,
  tool,
  subTool = null,
  icon,
} = defineProps<{
  label: string,
  icon: string,
  tool: Tool,
  subTool?: AnySubTool,
}>()
const selected = computed(() => tool == store.currentTool && subTool === store.currentSubTool)
</script>
<template>
  <button
    @click="store.setTool(tool, subTool)"
    :class="{
            'btn btn-sm': true,
            'btn-primary': selected,
            'btn-outline-primary': !selected,
          }"
    :title="label"
  >
    <span class="material-symbols-outlined">{{ icon }}</span>
  </button>
</template>
<style scoped lang="scss">

</style>