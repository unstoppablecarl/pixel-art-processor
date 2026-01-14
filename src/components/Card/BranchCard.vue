<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { getValidationErrorComponent } from '../../lib/pipeline/errors/errors.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import PipelineBranch from '../Processor/PipelineBranch.vue'
import AddNodeAfterDropDown from '../UI/AddNodeAfterDropDown.vue'
import ExecutionTimer from '../UI/ExecutionTimer.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'

const store = usePipelineStore()
const nodeRegistry = getNodeRegistry()

const {
  branchId,
  branchIndexLabel = '',
  canAddNodes = true,
} = defineProps<{
  branchId: NodeId,
  branchIndexLabel?: string | number,
  canAddNodes?: boolean
}>()

const branch = computed(() => store.maybeGetBranch(branchId))

const displayName = computed(() => {
  if (!branch.value?.def) return ''
  return nodeRegistry.get(branch.value.def).displayName
})
const nodeIds = computed((): NodeId[] => {
  if (!branch) return []
  return store.getBranchDescendantNodeIds(branchId)
})

const cssStyle = computed(() => {
  const width = branch.value?.outputPreview?.width ?? store.getFallbackOutputWidth(branch.value)
  return [
    `--node-img-width: ${width}px;`,
  ].join(' ')
})
</script>
<template>
  <div class="branch">
    <div class="fork-branch-header hstack">
      <ExecutionTimer
        class="ms-auto"
        :time-ms="branch?.lastExecutionTimeMS"
      />
      <ExecutionTimer
        class="ms-3"
        label="(Total)"
        :time-ms="branch?.lastBranchTotalExecutionTimeMS"
      />
    </div>
    <div
      v-if="branch"
      :style="cssStyle"
      :class="{
      'card card-fork-branch': true,
      'border-danger': branch?.validationErrors.length,
    }"
  >
    <div class="card-header hstack" v-if="branch">
      <div class="me-auto pe-2">{{ displayName }}: {{ branchId ?? branchIndexLabel ?? (branch.branchIndex + 1) }}</div>

      <SeedPopOver class="ms-auto me-1" v-model="branch.seed" />

      <BButtonGroup class="fork-branch-controls">
        <button role="button" class="btn btn-sm btn-danger d-inline-block"
                @click="store.remove(branch.id)">
          <span class="material-symbols-outlined">delete</span>
        </button>

        <button role="button" class="btn btn-sm btn-secondary d-inline-block"
                @click="store.duplicateBranchNode(branch.id)">
          <span class="material-symbols-outlined">content_copy</span>
        </button>

        <template v-if="!nodeIds.length && canAddNodes">
          <AddNodeAfterDropDown
            size="sm"
            :node-id="branch.id"
          />
        </template>
      </BButtonGroup>
    </div>

    <div class="card-body" v-if="branch.forkValidationErrors.length">
      <div class="section-heading text-danger"
           v-if="branch.forkValidationErrors.length && branch.validationErrors.length">
        Fork Output
      </div>
      <div class="section" v-for="error in branch.forkValidationErrors">
        <component :is="getValidationErrorComponent(error)" :error="error" />
      </div>
    </div>

    <div class="card-body" v-if="branch.validationErrors.length">
      <div class="section-heading text-danger"
           v-if="branch.forkValidationErrors.length && branch.validationErrors.length">
        Branch Output
      </div>
      <div class="section" v-for="error in branch.validationErrors">
        <component :is="getValidationErrorComponent(error)" :error="error" />
      </div>
    </div>

    <slot name="before-nodes">
    </slot>

    <slot name="nodes">
      <div class="card-body">
        <div class="branch">
          <PipelineBranch
            :node-ids="nodeIds"
          />
        </div>
      </div>
    </slot>

    <slot name="after-nodes">
    </slot>

  </div>
</template>
