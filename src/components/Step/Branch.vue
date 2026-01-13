<script lang="ts">
import { type NodeDef, NodeType } from '../../lib/pipeline/_types.ts'
import { defineBranch } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineBranch({
  type: NodeType.BRANCH,
  def: 'branch' as NodeDef,
  displayName: 'Branch',
  passthrough: true,
})
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineBranchHandler, useBranchHandler } from '../../lib/pipeline/NodeHandler/BranchHandler.ts'
import BranchCard from '../Card/BranchCard.vue'

const { branchId } = defineProps<{
  branchId: NodeId,
}>()

const handler = defineBranchHandler(STEP_META)
const branch = useBranchHandler(branchId, handler)

</script>
<template>
  <BranchCard :branch="branch" />
</template>
