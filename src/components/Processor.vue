<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { NodeId } from '../lib/pipeline/Node.ts'
import { usePipelineStore } from '../lib/store/pipeline-store.ts'
import AppHeader from './AppHeader.vue'
import AddRootStepButtons from './Processor/AddRootStepButtons.vue'
import PipelineBranch from './Processor/PipelineBranch.vue'

const store = usePipelineStore()

const rootNodeIds = computed((): NodeId[] => {
  const root = store.rootNode()
  if (!root) return []

  const ids: NodeId[] = []
  let current = root

  while (current) {
    ids.push(current.id)
    const next = Object.values(store.nodes).find(n => n.prevNodeId === current.id)
    if (!next) break
    current = next
  }

  return ids
})

const rootSteps = computed(() => rootNodeIds.value.map(id => store.get(id)))

watch(() => store.imgScale, () => {
  document.documentElement.style.setProperty('--step-img-scale', '' + store.imgScale)
}, { immediate: true })

onMounted(() => {
  store.markRootDirty()
})
</script>

<template>
  <AppHeader />

  <div class="overflow">
    <div class="processor-container px-3 pb-3 min-vw-100">
      <PipelineBranch
        :node-ids="rootNodeIds"
      />
    </div>

    <div class="after-nodes-container p-4" v-if="!rootSteps.length">
      <AddRootStepButtons />
    </div>

    <!--    <GridPatternPreview />-->
  </div>
</template>
