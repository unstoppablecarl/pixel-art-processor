<script lang="ts">
import { type NodeDef, NodeType } from '../../../lib/pipeline/_types.ts'
import { defineBranch } from '../../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineBranch({
  type: NodeType.BRANCH,
  def: 'wang_tile_branch_variant' as NodeDef,
  displayName: 'Branch Variant',
  passthrough: true,
  render: false,
})
</script>
<script setup lang="ts">
import { computed } from 'vue'
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { defineBranchHandler, useBranchHandler } from '../../../lib/pipeline/NodeHandler/BranchHandler.ts'
import { parseResult, type SingleRunnerResult } from '../../../lib/pipeline/NodeRunner.ts'
import type { PassThrough } from '../../../lib/node-data-types/PassThrough.ts'
import { PixelMap } from '../../../lib/node-data-types/PixelMap.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import BranchCard from '../../Card/BranchCard.vue'
import NodeImage from '../../NodeImage.vue'
import ExecutionTimer from '../../UI/ExecutionTimer.vue'
import { useSiblingBranchVariantsOf } from './_WangTileComposables.ts'

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
const siblings = useSiblingBranchVariantsOf(branch.config.parentBranchId!)
const variantIndex = computed(() => {
  return siblings.value.indexOf(branch) + 1
})

</script>
<template>
  <BranchCard
    :branch-id="branch.id"
    class="card-wang-tile-branch-variant"
    :can-add-nodes="false"
    :show-header="false"
  >
    <template #card-header>
      Variant : {{ variantIndex }}
    </template>
    <template #card-header-controls>
      <ExecutionTimer
        class="me-2"
        :time-ms="branch?.lastExecutionTimeMS"
      />
    </template>
    <template #nodes>
      <div class="d-flex">
        <NodeImage :image-data="branch.forkPreview" />
        <NodeImage :image-data="branch.outputPreview" />
      </div>
    </template>
  </BranchCard>
</template>
<style lang="scss">
.card-wang-tile-branch-variant {
  .card-header {
    --bs-card-cap-padding-y: 0.25rem;
    --bs-card-cap-padding-x: 0.25rem;
    padding-left: 0.5rem;
  }

  .node-img-container {
    padding: 6px;

    .node-img-label {
      padding-bottom: 5px;
    }
  }

  .btn-sm {
    --bs-btn-padding-x: 0.3rem;
    --bs-btn-padding-y: 0.1rem;
  }

  > .card-branch {
    margin-bottom: 0.5rem;
  }
}
</style>
