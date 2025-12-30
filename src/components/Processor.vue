<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useStepStore } from '../lib/store/step-store.ts'
import AppHeader from './AppHeader.vue'
import AddRootStepButtons from './Processor/AddRootStepButtons.vue'
import GridPatternPreview from './Processor/GridPatternPreview.vue'
import PipelineBranch from './Processor/PipelineBranch.vue'

const store = useStepStore()

watch(() => store.imgScale, () => {
  const root = document.documentElement
  root.style.setProperty('--step-img-scale', '' + store.imgScale)
}, { immediate: true })

onMounted(() => {
  console.log('processor mounted')
  store.invalidateAll()
})
</script>
<template>

  <AppHeader />

  <div class="overflow">
    <div class="processor-container px-3 pb-3 min-vw-100">
      <PipelineBranch
        :step-ids="store.rootStepIds"
        :parent-fork-id="null"
        :branch-index="null"
      />
    </div>
    <div class="after-steps-container p-4" v-if="!store.rootSteps.length">
      <AddRootStepButtons />
    </div>
    <GridPatternPreview />
  </div>
</template>
