<script setup lang="ts">
import { computed } from 'vue'
import { type AnyForkNode, isFork, type NodeId } from '../../lib/pipeline/Node.ts'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import PipelineForkBranches from './PipelineForkBranches.vue'

const store = usePipelineStore()
const stepRegistry = useStepRegistry()

const { nodeIds } = defineProps<{
  nodeIds: NodeId[],
}>()

const allNodes = computed(() => {
  if (!nodeIds.length) {
    return { nodes: [], fork: null }
  }

  const nodes = nodeIds.map(id => store.get(id))
  const last = nodes[nodes.length - 1]

  if (isFork(last)) {
    return {
      nodes: nodes.slice(0, -1),
      fork: last as AnyForkNode,
    }
  }

  return {
    nodes: nodes,
    fork: null,
  }
})
</script>

<template>
  <div ref="branchDragContainer" class="processor-branch">
    <template v-if="allNodes.nodes.length">
      <template v-for="node in allNodes.nodes" :key="node.id">
        <component
          :is="stepRegistry.defToComponent(node.def)"
          :node-id="node.id"
          class="node"
        />
      </template>
    </template>

    <div v-else class="empty-branch-placeholder">
      Drop Here
    </div>
  </div>

  <template v-if="allNodes.fork">
    <component
      :is="stepRegistry.defToComponent(allNodes.fork.def)"
      :node-id="allNodes.fork.id"
      class="node"
    />
    <PipelineForkBranches :fork-node-id="allNodes.fork.id" />
  </template>
</template>
