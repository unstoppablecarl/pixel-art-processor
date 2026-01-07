<script lang="ts">
import { type AnyStepMeta, NodeType } from '../../lib/pipeline/_types.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.BRANCH,
  def: 'wang_tile_branch',
  displayName: 'Wang Tile: Branch',
  passthrough: true,
}
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { useBranchHandler } from '../../lib/pipeline/useStepHandler.ts'
import BranchCard from '../Card/BranchCard.vue'

const { branchNodeId } = defineProps<{
  branchNodeId: NodeId,
}>()

const branch = useBranchHandler(branchNodeId)

</script>
<template>
  <BranchCard :branch="branch" />
</template>
