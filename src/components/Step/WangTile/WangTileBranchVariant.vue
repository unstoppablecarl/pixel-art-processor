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
import { reactive } from 'vue'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { defineBranchHandler } from '../../../lib/pipeline/NodeHandler/BranchHandler.ts'
import { useBranchHandler } from '../../../lib/pipeline/NodeHandler/useHandlers.ts'
import { parseResult, type SingleRunnerResult } from '../../../lib/pipeline/NodeRunner.ts'
import type { PassThrough } from '../../../lib/step-data-types/PassThrough.ts'
import { PixelMap } from '../../../lib/step-data-types/PixelMap.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import BranchCard from '../../Card/BranchCard.vue'
import StepImage from '../../StepImage.vue'

const store = usePipelineStore()
const { branchId } = defineProps<{
  branchId: NodeId,
}>()

const handler = defineBranchHandler(STEP_META, {
  config() {
    return {
      parentBranchId: null as NodeId | null,
    }
  },
  reactiveConfig: reactive,
  async run({ config, inputData, meta }) {
    const parentBranch = store.get(config.parentBranchId!)

    let prevOutput: SingleRunnerResult<any> = parseResult({
      output: inputData,
      meta: meta,
    }, meta)

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

    let finalPreview = prevOutput.preview
    if (prevOutput.preview && branch.forkPreview) {
      const img = PixelMap.fromImageData(prevOutput.preview)
      const edgePreview = PixelMap.fromImageData(branch.forkPreview)

      finalPreview = img.merge(edgePreview).toImageData()
    }

    return {
      output: prevOutput.output as PassThrough,
      preview: finalPreview,
      meta: prevOutput.meta,
    }
  },
})

const branch = useBranchHandler(branchId, STEP_META, handler)


</script>
<template>
  <BranchCard :branch="branch">
    <template #nodes>
      <div class="card-body d-flex">
        <StepImage :image-data="branch.forkPreview" />
        <StepImage :image-data="branch.outputPreview" />
      </div>
    </template>
  </BranchCard>
</template>
