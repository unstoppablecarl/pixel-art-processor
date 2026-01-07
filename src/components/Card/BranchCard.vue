<script setup lang="ts">
import { BButtonGroup } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { getValidationErrorComponent } from '../../lib/errors.ts'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { type InitializedBranchNode, isBranch, isFork } from '../../lib/pipeline/Node.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import PipelineBranch from '../Processor/PipelineBranch.vue'
import AddNodeAfterDropDown from '../UI/AddNodeAfterDropDown.vue'
import SeedPopOver from '../UI/SeedPopOver.vue'

const store = usePipelineStore()

const { branch } = defineProps<{
  branch: InitializedBranchNode<any>,
}>()

const nodeIds = computed((): NodeId[] => {
  if (!branch) return []
  const ids: NodeId[] = []
  let currentId = store.get(branch.id).childIds(store)[0] as NodeId

  while (currentId) {
    ids.push(currentId)
    const current = store.get(currentId)
    if (isFork(current)) {
      break
    }
    let next

    next = current.childIds(store)[0] as NodeId
    currentId = next
    if (isBranch(current)) throw new Error('should not be a branch here')
  }

  return ids
})
</script>
<template>
  <div
    :class="{
      'card card-fork-branch': true,
      'border-danger': branch.validationErrors.length,
    }"
  >
    <div class="card-header hstack" v-if="branch">
      <div class="me-auto pe-2">Branch {{ branch.branchIndex + 1 }}</div>

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

        <template v-if="!nodeIds.length">
          <AddNodeAfterDropDown
            size="sm"
            :node-id="branch.id"
          />
        </template>
      </BButtonGroup>
    </div>

    <div class="card-body" v-if="branch.validationErrors.length">
      <div class="section" v-for="error in branch.validationErrors">
        <component :is="getValidationErrorComponent(error)" :error="error" />
      </div>
    </div>

    <div class="card-body">
      <div class="branch">
        <PipelineBranch
          :node-ids="nodeIds"
        />
      </div>
    </div>
  </div>
</template>
