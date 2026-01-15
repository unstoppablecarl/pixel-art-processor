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
import { BButton } from 'bootstrap-vue-next'
import { computed, ref } from 'vue'
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
const fork = computed(() => store.getFork(branch.prevNodeId))
const siblingBranchVariants = useSiblingBranchVariantsOf(branch.id)

function add() {
  const fork = branch.getPrev(store)
  const seed = siblingBranchVariants.value.length + 1
  store.addBranch(variantStepMeta.def as NodeDef, fork.id, { parentBranchId: branch.id }, { seed })
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

const showAll = ref(true)

function expandAll() {
  siblingBranchVariants.value.forEach((sibling) => sibling.visible = true)
}

function collapseAll() {
  siblingBranchVariants.value.forEach((sibling) => sibling.visible = false)
}
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
        <button
          role="button"
          :class="{
            'btn btn-secondary btn-sm ': true,
            'disabled': !fork.canAddBranch.value,
          }"
          @click="add()"
          :disabled="!fork.canAddBranch.value"
        >
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
      <div class="ms-2">
        {{ variantCount }} / {{ fork.maxBranchCount.value! - 1 }}
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

        <div class="hstack ps-3 pe-2">
          <div>
            Variants: {{ variantCount }}
          </div>

          <BButton
            size="sm"
            class="btn-collapse-all ms-auto"
            variant="transparent"
            @click="collapseAll()"
          >
            <span class="material-symbols-outlined">keyboard_double_arrow_up</span>
          </BButton>
          <BButton
            size="sm"
            class="btn-collapse-all ms-1"
            variant="transparent"
            @click="expandAll()"
          >
            <span class="material-symbols-outlined">keyboard_double_arrow_down</span>
          </BButton>

          <BButton
            :class="'btn-collapse ms-1' + (showAll ? '' : ' collapsed')"
            size="sm"
            variant="transparent"
            :aria-expanded="showAll ? 'true' : 'false'"
            @click="showAll = !showAll"
          />
        </div>
        <div class="auto-animate" v-auto-animate>
          <div v-if="showAll">
            <template v-for="item in siblingBranchVariants">
              <NodeContainer
                :node-id="item.id"
                :node-def="item.def"
                :force-render="true"
              />
            </template>
          </div>
        </div>
      </div>
    </template>
  </BranchCard>
</template>
<style lang="scss">
.variant-count {
  max-width: 100px;
}
</style>
