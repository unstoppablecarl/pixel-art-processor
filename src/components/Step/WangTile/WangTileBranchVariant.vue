<script lang="ts">
import { defineStepMeta, NodeType } from '../../../lib/pipeline/_types.ts'

export const STEP_META = defineStepMeta({
  type: NodeType.BRANCH,
  def: 'wang_tile_branch_variant',
  displayName: 'Wang Tile: Branch Variant',
  passthrough: true,
  isValidDescendantDef: () => false,
})
</script>
<script setup lang="ts">
import type { IRunnerResultMeta, NodeId } from '../../../lib/pipeline/_types.ts'
import { StepValidationError } from '../../../lib/pipeline/errors/StepValidationError.ts'
import { parseResult } from '../../../lib/pipeline/NodeRunner.ts'
import type { AnyStepContext } from '../../../lib/pipeline/Step.ts'
import { useBranchHandler } from '../../../lib/pipeline/useStepHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import BranchCard from '../../Card/BranchCard.vue'
import StepImage from '../../StepImage.vue'

const store = usePipelineStore()
const { branchId } = defineProps<{
  branchId: NodeId,
}>()

type StepRunnerResult = {
  preview: ImageData | null,
  output: AnyStepContext['Output'] | null,
  meta: IRunnerResultMeta,
  validationErrors: StepValidationError[]
}

const branch = useBranchHandler(branchId, STEP_META, {
  config() {
    return {
      parentBranchId: null as NodeId | null,
    }
  },
  async run({ config, inputData, meta }) {
    const parentBranch = store.get(config.parentBranchId!)

    let prevOutput: StepRunnerResult = parseResult({
      output: inputData,
      meta: meta,
    })

    const parentBranchDescendantIds = store.getDescendantIds(parentBranch.id)
    for (const stepId of parentBranchDescendantIds) {
      const step = store.getStep(stepId)

      prevOutput = await step.runRaw({
        config: step.config!,
        inputData: prevOutput.output,
        inputPreview: prevOutput.preview,
        meta: prevOutput.meta,
      })
    }

    return {
      output: prevOutput.output,
      meta: prevOutput.meta,
    }
  },
})

</script>
<template>
  <BranchCard :branch="branch">
    <template #nodes>
      <div class="card-body">
        <StepImage :image-data="branch.outputPreview" />
      </div>
    </template>
  </BranchCard>
</template>
