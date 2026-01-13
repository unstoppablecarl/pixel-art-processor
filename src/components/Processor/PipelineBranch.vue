<script setup lang="ts">
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { type AnyForkNode, isFork } from '../../lib/pipeline/Node.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import NodeContainer from '../NodeSupport/NodeContainer.vue'
import PipelineForkBranches from './PipelineForkBranches.vue'

const store = usePipelineStore()
const nodeRegistry = getNodeRegistry()

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
  <div class="processor-branch">
    <template v-if="allNodes.nodes.length">
      <template v-for="node in allNodes.nodes" :key="node.id">
        <NodeContainer :node-id="node.id" :node-def="node.def" class="node" />

      </template>
    </template>

    <!--    <div v-else class="empty-branch-placeholder">-->
    <!--      Drop Here-->
    <!--    </div>-->
  </div>

  <template v-if="allNodes.fork">
    <NodeContainer :node-id="allNodes.fork.id" :node-def="allNodes.fork.def" class="node" />

    <PipelineForkBranches :fork-node-id="allNodes.fork.id" />
  </template>
</template>
