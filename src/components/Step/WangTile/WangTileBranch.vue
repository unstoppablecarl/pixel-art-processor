<script lang="ts">
import { type AnyStepDefinition, type AnyStepMeta, NodeType } from '../../../lib/pipeline/_types.ts'

export const STEP_META: AnyStepMeta = {
  type: NodeType.BRANCH,
  def: 'wang_tile_branch',
  displayName: 'Wang Tile: Branch',
  passthrough: true,
  isValidDescendantDef: (def: AnyStepDefinition) => def.type === NodeType.STEP,
}
</script>
<script setup lang="ts">
import type { NodeId } from '../../../lib/pipeline/_types.ts'
import { useBranchHandler } from '../../../lib/pipeline/useStepHandler.ts'
import BranchCard from '../../Card/BranchCard.vue'

const { branchId } = defineProps<{
  branchId: NodeId,
}>()

const branch = useBranchHandler(branchId, {
  ...STEP_META,
  config() {
    return {
      variantCount: 0,
    }
  },
  onRemove(store, branch) {
      const fork = branch.getPrev(store)

  },
})

function add() {
  branch.config.variantCount++
  // @TODO duplicate this branch's nodes into a WangTileBranchVariant
}

function remove() {
  branch.config.variantCount--
  // @TODO remove one of this branch's nodes into a WangTileBranchVariant

}
</script>
<template>
  <BranchCard :branch="branch">
    <template #before-nodes>
      <div class="card-body">
        <div class="section">
          <div class="input-group">
            <span class="input-group-text">Variant Count</span>
            <input class="form-control" v-model="branch.config.variantCount" type="number" min="1"
                   style="width: 100px" />
            <button role="button" class="btn btn-secondary btn-sm" @click="remove()">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <button role="button" class="btn btn-secondary btn-sm" @click="add()">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </BranchCard>
</template>
