<script lang="ts">
import { type AnyStepMeta, NodeType } from '../../lib/pipeline/_types.ts'
export const STEP_META: AnyStepMeta = {
  type: NodeType.BRANCH,
  def: 'branch',
  displayName: 'Branch',
  passthrough: true,
}
</script>
<script setup lang="ts">
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { useBranchHandler } from '../../lib/pipeline/useStepHandler.ts'
import BranchCard from '../Card/BranchCard.vue'

const { branchId } = defineProps<{
  branchId: NodeId,
}>()

const branch = useBranchHandler(branchId)

</script>
<template>
  <BranchCard :branch="branch" />
</template>
