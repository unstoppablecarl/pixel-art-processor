<script lang="ts">
import { type AnyNodeDefinition, defineStepMeta, NodeType } from '../../../lib/pipeline/_types.ts'

export const STEP_META = defineStepMeta({
  type: NodeType.BRANCH,
  def: 'wang_tile_branch',
  displayName: 'Wang Tile: Branch',
  passthrough: true,
  isValidDescendantDef: (def: AnyNodeDefinition) => def.type === NodeType.STEP,
})
</script>
<script setup lang="ts">
import { computed } from 'vue'
import type { NodeDef, NodeId } from '../../../lib/pipeline/_types.ts'
import { defineBranchHandler } from '../../../lib/pipeline/NodeHandler/BranchHandler.ts'
import { useBranchHandler } from '../../../lib/pipeline/NodeHandler/useHandlers.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import BranchCard from '../../Card/BranchCard.vue'
import { STEP_META as variantStepMeta } from './WangTileBranchVariant.vue'

const store = usePipelineStore()

const { branchId } = defineProps<{
  branchId: NodeId,
}>()

const handler = defineBranchHandler(STEP_META, {
  config() {
    return {}
  },
  onRemoving(node) {
    siblingBranchVariants.value.forEach((sibling) => store.remove(sibling.id))
  },
  async run({ inputData, meta, inputPreview }) {
    return {
      output: inputData,
      preview: inputPreview,
      meta,
    }
  },
  onBranchEndResolved() {
    siblingBranchVariants.value.forEach((sibling) => store.markDirty(sibling.id))
  },
})

const branch = useBranchHandler(branchId, STEP_META, handler)
const fork = computed(() => branch.getPrev(store))

const siblingBranchVariants = computed(() => {
  return branch.getSiblings(store, (otherBranch) => otherBranch?.config?.parentBranchId === branch.id)
})

function add() {
  const fork = branch.getPrev(store)
  const newBranch = store.addBranch(variantStepMeta.def as NodeDef, fork.id)
  newBranch.loadSerialized = { config: { parentBranchId: branch.id } }
}

function remove() {
  const first = siblingBranchVariants.value[0]
  if (first) {
    store.remove(first.id)
  }
}

const variantCount = computed<number, number>({
  get: () => siblingBranchVariants.value.length,
  set(value: number) {
    const diff = value - siblingBranchVariants.value.length
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        add()
      }
    } else if (diff < 0) {
      for (let i = 0; i < diff * -1; i++)
        remove()
    }
  },
})
</script>
<template>
  <BranchCard :branch="branch">
    <template #before-nodes>
      <div class="card-body">
        <div class="section">
          <div class="input-group">
            <span class="input-group-text">Variant Count</span>
            <input class="form-control" v-model="variantCount" type="number" min="0"
                   style="width: 100px" />
            <button role="button" class="btn btn-secondary btn-sm" @click="remove()" :disabled="variantCount === 0">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <button role="button" class="btn btn-secondary btn-sm" @click="add()"
                    :disabled="!fork.canAddBranch">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </BranchCard>
</template>
