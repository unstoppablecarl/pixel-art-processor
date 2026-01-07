<script setup lang="ts">
import { computed } from 'vue'
import { type ForkDefinition, type NodeId } from '../../lib/pipeline/_types.ts'

import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const store = usePipelineStore()
const stepRegistry = useStepRegistry()

const { forkNodeId } = defineProps<{ forkNodeId: NodeId }>()

const fork = computed(() => store.getFork(forkNodeId))
const branches = computed(() => fork.value.branchIds.value.map(store.getBranch))

const addableBranches = computed(() => {
  const definition = stepRegistry.get(fork.value.def) as ForkDefinition<any, any>

  return definition.branchDefs.map(stepRegistry.get)
})
</script>
<template>
  <div class="fork-branches">
    <div class="fork-branch-header-spacer">&nbsp;</div>
    <template
      v-for="branch in branches"
      :key="`${forkNodeId}-branch-${branch.id}`"
    >
      <component
        :is="stepRegistry.defToComponent(branch.def)"
        :branch-id="branch.id"
      />
    </template>

    <template v-for="branchDef in addableBranches">
      <button role="button" class="btn btn-sm btn-secondary" @click="store.add(branchDef.def, forkNodeId)">
        <span class="material-symbols-outlined">add</span> {{ branchDef.displayName }}
      </button>
    </template>
  </div>
</template>
