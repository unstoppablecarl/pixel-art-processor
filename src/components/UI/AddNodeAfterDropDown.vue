<script setup lang="ts">
import { BButtonGroup, BDropdown, BDropdownHeader, BDropdownItem, BTooltip } from 'bootstrap-vue-next'
import { computed, ref } from 'vue'
import type { NodeId } from '../../lib/pipeline/_types.ts'
import { getNodeRegistry } from '../../lib/pipeline/NodeRegistry.ts'
import { type AnyNodeDefinition } from '../../lib/pipeline/types/definitions.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'

const store = usePipelineStore()
const nodeRegistry = getNodeRegistry()

const {
  nodeId,
} = defineProps<{
  nodeId: NodeId,
}>()

const addableNodes = computed(() => {
  const node = store.get(nodeId)

  const result = nodeRegistry.addableToArray()
    .filter(({ def }) => nodeRegistry.canBeChildOf(store, def, node.id))
    .map((meta: AnyNodeDefinition) => {
        return {
          compatible: nodeRegistry.isCompatibleWithOutputType(meta.def, node.handler!.currentOutputDataType),
          meta,
          color: {
            ...nodeRegistry.getColorInfo(meta.def),
          },
        }
      },
    )

  if (!showAll.value) {
    return result.filter(c => c.compatible)
  }
  return result
})

const showAll = ref(true)

</script>
<template>
  <BDropdown
    v-if="addableNodes.length"
    no-caret
  >
    <template #button-content>
      <span class="material-symbols-outlined">add</span>
    </template>

    <BDropdownHeader>
      <strong class="me-2">Show</strong>
      <BButtonGroup>

        <button
          role="button"
          :class="{'btn btn-sm btn-outline-secondary': true, active: showAll}"
          @click.stop="showAll = true"
        >
          All
        </button>
        <button
          role="button"
          :class="{'btn btn-sm btn-outline-secondary': true, active: !showAll}"
          @click.stop="showAll = false"
        >
          Only Compatible
        </button>
      </BButtonGroup>
    </BDropdownHeader>

    <BDropdownItem
      v-for="{meta, compatible, color} in addableNodes"
      :key="meta.def"
      @click="store.add(meta.def ,nodeId)"
      :class="{ 'incompatible-data-type': !compatible }"
    >

      <BTooltip
        teleport-to="body"
        variant="dark"
      >
        <template #target>
          <span v-for="{cssClass} in color.inputDataTypes" :class="'badge rounded-pill ' + cssClass">&bull;</span>
        </template>
        Input: {{ color.inputDataTypes.map(t => t.displayName).join(', ') }}
      </BTooltip>
      <span class="mx-2">
        {{ meta.displayName }}
      </span>

      <BTooltip
        teleport-to="body"
        variant="dark"
      >
        <template #target>
          <span :class="'badge rounded-pill ' + color.outputDataType.cssClass">&bull;</span>
        </template>
        Output: {{ color.outputDataType.displayName }}
      </BTooltip>

    </BDropdownItem>
  </BDropdown>
</template>
<style lang="scss">
.incompatible-data-type {
  opacity: 0.5
}
</style>