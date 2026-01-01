<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { usePipelineStore } from '../lib/store/pipeline-store.ts'
import AppHeader from './AppHeader.vue'
import AddRootStepButtons from './Processor/AddRootStepButtons.vue'
import GridPatternPreview from './Processor/GridPatternPreview.vue'
import PipelineBranch from './Processor/PipelineBranch.vue'

const store = usePipelineStore()

const rootStepIds = computed(() => {
  const root = store.rootNode()
  if (!root) return []

  const ids: string[] = []
  let current = root

  while (current) {
    ids.push(current.id)
    const next = Object.values(store.nodes).find(n => n.prevNodeId === current.id)
    if (!next) break
    current = next
  }

  return ids
})

const rootSteps = computed(() => rootStepIds.value.map(id => store.get(id)))

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
        :step-ids="rootStepIds"
        :parent-fork-id="null"
        :branch-index="null"
      />
    </div>

    <div class="after-steps-container p-4" v-if="!rootSteps.length">
      <AddRootStepButtons />
    </div>

<!--    <GridPatternPreview />-->
  </div>
</template>
