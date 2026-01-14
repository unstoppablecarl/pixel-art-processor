<script setup lang="ts">
import { BButton, BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { getValidationErrorComponent } from '../../lib/pipeline/errors/errors.ts'
import type { AnyNode } from '../../lib/pipeline/Node.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import PipelineBranch from '../Processor/PipelineBranch.vue'
import AddNodeAfterDropDown from '../UI/AddNodeAfterDropDown.vue'
import ExecutionTimer from '../UI/ExecutionTimer.vue'
import NodeInfo from '../UI/NodeInfo.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'

const store = usePipelineStore()
const nodeRegistry = getNodeRegistry()

const {
  branchId,
  branchIndexLabel = '',
  canAddNodes = true,
  showHeader = true,
} = defineProps<{
  branchId: NodeId,
  branchIndexLabel?: string | number,
  canAddNodes?: boolean,
  showHeader?: boolean,
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

const childNodes = computed((): AnyNode[] => {
  if (!branch) return []
  return nodeIds.value.map(store.get)
})

const branchChainElapsedMsTotal = computed(() => {
  return childNodes.value.reduce((accumulator, current: AnyNode) => accumulator + (current.lastExecutionTimeMS ?? 0), 0)
})
const indexLabel = computed(() => {
  if (!branch.value) return ''
  return branchIndexLabel ?? (branch.value.branchIndex + 1)
})

const cssStyle = computed(() => {
  const width = branch.value?.outputPreview?.width ?? store.getFallbackOutputWidth(branch.value)
  return [
    `--node-img-width: ${width}px;`,
  ].join(' ')
})
</script>
<template>
  <div class="branch" v-if="branch">
    <slot name="branch-header">
      <div class="branch-header hstack" v-if="showHeader">
        <div>{{ displayName }}: {{ indexLabel }}</div>
        <ExecutionTimer
          class="ms-auto"
          :time-ms="branch?.lastExecutionTimeMS"
        />
        <ExecutionTimer
          class="ms-3"
          label="(Total)"
          :time-ms="branchChainElapsedMsTotal"
        />
      </div>
    </slot>
    <div
      :style="cssStyle"
      :class="{
        'card card-branch': true,
        'border-danger': branch?.validationErrors.length,
      }"
    >
      <div class="card-header hstack">
        <NodeInfo :node-id="branch.id" class="me-2" />
        <slot name="card-header"></slot>

        <div class="vr ms-auto me-2"></div>

        <slot name="card-header-controls"></slot>

        <SeedPopOver class="me-1" v-model="branch.seed" />
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
        <BButton
          :class="'btn-collapse ms-1 ' + (branch.visible ? null : 'collapsed')"
          size="sm"
          variant="transparent"
          :aria-expanded="branch.visible ? 'true' : 'false'"
          @click="branch.visible = !branch.visible"
        />
      </div>
      <div class="auto-animate" v-auto-animate>
        <div class="card-body" v-if="branch.visible">

          <div v-if="branch.forkValidationErrors.length">
            <div class="section-heading text-danger"
                 v-if="branch.forkValidationErrors.length && branch.validationErrors.length">
              Fork Output
            </div>
            <div class="section" v-for="error in branch.forkValidationErrors">
              <component :is="getValidationErrorComponent(error)" :error="error" />
            </div>
          </div>

          <div v-if="branch.validationErrors.length">
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
            <div class="branch-child-nodes">
              <PipelineBranch
                :node-ids="nodeIds"
              />
            </div>
          </slot>

          <slot name="after-nodes">
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>
