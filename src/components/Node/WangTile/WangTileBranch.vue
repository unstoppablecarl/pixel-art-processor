<script lang="ts">
import { NodeType } from '../../../lib/pipeline/_types.ts'
import { type AnyNodeDefinition, defineBranch } from '../../../lib/pipeline/types/definitions.ts'

export const STEP_META = defineBranch({
  type: NodeType.BRANCH,
  def: 'wang_tile_branch' as NodeDef,
  displayName: 'Wang Tile: Branch',
  passthrough: true,
  isValidDescendantDef: (def: AnyNodeDefinition) => def.type === NodeType.STEP,
})
</script>
<script setup lang="ts">
import { computed } from 'vue'
import type { NodeDef, NodeId, WatcherTarget } from '../../../lib/pipeline/_types.ts'
import type { AnyInitializedNode } from '../../../lib/pipeline/Node.ts'
import { defineBranchHandler, useBranchHandler } from '../../../lib/pipeline/NodeHandler/BranchHandler.ts'
import { usePipelineStore } from '../../../lib/store/pipeline-store.ts'
import BranchCard from '../../Card/BranchCard.vue'
import NodeContainer from '../../NodeSupport/NodeContainer.vue'
import { useSiblingBranchVariantsOf } from './_WangTileComposables.ts'
import { STEP_META as variantStepMeta } from './WangTileBranchVariant.vue'

const store = usePipelineStore()

const { nodeId } = defineProps<{
  nodeId: NodeId,
}>()

const handler = defineBranchHandler(STEP_META, {
  config() {
    return {
      variantScale: 1,
    }
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
  watcherTargets(node: AnyInitializedNode): WatcherTarget[] {
    return [node.seedWatcherTarget()]
  },
})

const branch = useBranchHandler(nodeId, handler)
const fork = computed(() => branch.getPrev(store))
const siblingBranchVariants = useSiblingBranchVariantsOf(branch.id)

function add() {
  const fork = branch.getPrev(store)
  store.addBranch(variantStepMeta.def as NodeDef, fork.id, { parentBranchId: branch.id })
}

function remove() {
  const last = siblingBranchVariants.value[siblingBranchVariants.value.length - 1]
  if (last) {
    store.remove(last.id)
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
const cssStyle = computed(() => '--node-img-scale: ' + branch.config.variantScale)

</script>
<template>
  <BranchCard :branch-id="branch.id">
    <template #card-header>
      <div class="input-group w-auto">
        <span class="input-group-text">Variants</span>
        <input class="form-control variant-count" v-model="variantCount" type="number" min="0"
               style="width: 100px" />
        <button role="button" class="btn btn-secondary btn-sm" @click="remove()" :disabled="variantCount === 0">
          <span class="material-symbols-outlined">remove</span>
        </button>
        <button role="button" class="btn btn-secondary btn-sm" @click="add()"
                :disabled="!fork.canAddBranch">
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
      <div class="ms-2">
        {{ variantCount }} / {{ fork.maxBranchCount }}
      </div>
    </template>
    <template #after-nodes>
      <div class="p-2" :style="cssStyle">
        <div class="form-group d-flex align-items-center gap-2 mb-3">
          <label
            for="scale"
            class="form-label form-label-sm mb-0 text-nowrap"
          >
            Preview Scale: {{ branch.config.variantScale }}
          </label>
          <input type="range"
                 class="form-range form-range-sm"
                 id="scale"
                 min="1"
                 max="10"
                 step="1"
                 style="width: 150px;"
                 v-model.number="branch.config.variantScale"
          >
        </div>

        <template v-for="item in siblingBranchVariants">
          <NodeContainer
            :node-id="item.id"
            :node-def="item.def"
            :force-render="true"
          />
        </template>
      </div>
    </template>
  </BranchCard>
</template>
<style lang="scss">
.variant-count {
  max-width: 100px;
}
</style>
