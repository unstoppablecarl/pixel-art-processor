<script lang="ts">
import { type NodeDef, NodeType } from '../../../lib/pipeline/_types.ts'
import { defineBranch } from '../../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineBranch({
  type: NodeType.BRANCH,
  def: 'wang_tile_branch_variant' as NodeDef,
  displayName: 'Wang Tile: Branch Variant',
  passthrough: true,
  render: false
})
</script>
<script setup lang="ts">
import { reactive } from 'vue'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { defineBranchHandler, useBranchHandler } from '../../../lib/pipeline/NodeHandler/BranchHandler.ts'
import { parseResult, type SingleRunnerResult } from '../../../lib/pipeline/NodeRunner.ts'
import type { PassThrough } from '../../../lib/node-data-types/PassThrough.ts'
import { PixelMap } from '../../../lib/node-data-types/PixelMap.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import BranchCard from '../../Card/BranchCard.vue'
import NodeImage from '../../NodeImage.vue'

const store = usePipelineStore()
const { nodeId } = defineProps<{
  nodeId: NodeId,
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

const branch = useBranchHandler(nodeId, handler)

</script>
<template>
  <BranchCard :branch="branch">
    <template #nodes>
      <div class="card-body d-flex">
        <NodeImage :image-data="branch.forkPreview" />
        <NodeImage :image-data="branch.outputPreview" />
      </div>
    </template>
  </BranchCard>
</template>
