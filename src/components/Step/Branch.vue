<script lang="ts">
import { NodeType } from '../../lib/pipeline/_types.ts'
import { defineBranch } from '../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineBranch({
  type: NodeType.BRANCH,
  def: 'branch',
  displayName: 'Branch',
  passthrough: true,
})
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { defineBranchHandler } from '../../lib/pipeline/NodeHandler/BranchHandler.ts'
import { useBranchHandler } from '../../lib/pipeline/NodeHandler/useHandlers.ts'
import BranchCard from '../Card/BranchCard.vue'

const { branchId } = defineProps<{
  branchId: NodeId,
}>()

const handler = defineBranchHandler(STEP_META)
const branch = useBranchHandler(branchId, STEP_META, handler)

</script>
<template>
  <BranchCard :branch="branch" />
</template>
