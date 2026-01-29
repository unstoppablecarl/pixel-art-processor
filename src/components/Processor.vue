<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { NodeId } from '../lib/pipeline/_types.ts'
import { isFork } from '../lib/pipeline/Node.ts'
import { usePipelineStore } from '../lib/store/pipeline-store.ts'
import { useUIStore } from '../lib/store/ui-store.ts'
import { useSidebar } from '../lib/vue/useSidebar.ts'
import AppHeader from './AppHeader.vue'
import CanvasPaintSidebar from './CanvasEditor/TileGridEdit/components/CanvasPaintSidebar.vue'
import AddRootStepButtons from './Processor/AddRootStepButtons.vue'
import PipelineBranch from './Processor/PipelineBranch.vue'
import WangTileGridPatternPreview from './Processor/WangTileGridPatternPreview.vue'

const store = usePipelineStore()
const uiStore = useUIStore()

const rootNodeIds = computed((): NodeId[] => {
  const root = store.rootNode()
  if (!root) return []

  const ids: NodeId[] = []
  let current = root

  while (current) {
    ids.push(current.id)
    if (isFork(current)) break
    const next = Object.values(store.nodes).find(n => n.prevNodeId === current.id)
    if (!next) break
    current = next
  }

  return ids
})

const rootSteps = computed(() => rootNodeIds.value.map(id => store.get(id)))

watch(() => uiStore.imgScale, () => {
  document.documentElement.style.setProperty('--node-img-scale', '' + uiStore.imgScale)
}, { immediate: true })

onMounted(() => {
  store.markRootDirty()
})

const { visible } = useSidebar()
</script>
<template>
  <AppHeader />

  <div :class="{
    'overflow': true,
    'tool-sidebar-visible' : visible
  }">
    <CanvasPaintSidebar />
    <div class="processor-container pb-3">
      <PipelineBranch
        :node-ids="rootNodeIds"
      />
    </div>

    <div class="add-root-nodes-container p-4" v-if="!rootSteps.length">
      <AddRootStepButtons />
    </div>

    <WangTileGridPatternPreview />
  </div>
</template>
