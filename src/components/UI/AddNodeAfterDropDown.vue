<script setup lang="ts">
import { BButtonGroup, BDropdown, BDropdownHeader, BDropdownItem, BTooltip } from 'bootstrap-vue-next'
import { computed, ref } from 'vue'
import type { NodeDef, NodeId } from '../../lib/pipeline/Node.ts'
import type { StepMeta } from '../../lib/pipeline/StepMeta.ts'
import { useStepRegistry } from '../../lib/pipeline/StepRegistry.ts'
import { PassThrough } from '../../lib/step-data-types/PassThrough.ts'
import { usePipelineStore } from '../../lib/store/pipeline-store.ts'
import { getNodeDataTypeCssClass, type StepDataType } from '../../steps.ts'

const store = usePipelineStore()

const emit = defineEmits(['add'])
const {
  nodeId,
} = defineProps<{
  nodeId: NodeId,
}>()

const addableSteps = computed(() => {
  const stepRegistry = useStepRegistry()
  const node = store.get(nodeId)

  const result = stepRegistry.addableToArray().map((
      {
        def,
        displayName,
        inputDataTypes,
        outputDataType,
        passthrough,
      }: StepMeta<any, any>) => {

      const input: StepDataType[] = passthrough ? [PassThrough] : inputDataTypes
      const output: StepDataType = passthrough ? PassThrough : outputDataType

      let inputNames: string[] = ['None']
      let outputName: string = 'None'
      let inputColorCssClass = ['bg-secondary']
      let outputColorCssClass: string

      if (passthrough) {
        inputColorCssClass = [getNodeDataTypeCssClass(PassThrough)]
        inputNames = [PassThrough.displayName]
        outputName = PassThrough.displayName

      } else {
        if (inputDataTypes.length) {
          inputColorCssClass = input.map(getNodeDataTypeCssClass)
          inputNames = input.map(c => c.displayName)
          outputName = output.displayName
        }
      }

      outputColorCssClass = getNodeDataTypeCssClass(output)

      return {
        def,
        displayName,
        compatible: stepRegistry.isCompatibleWithOutputType(def as NodeDef, node.handler!.outputDataType),
        inputColorCssClass,
        outputColorCssClass: outputColorCssClass,
        inputNames,
        outputName,
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
    v-if="addableSteps.length"
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
      v-for="{def, displayName, inputColorCssClass, outputColorCssClass, inputNames, outputName, compatible} in addableSteps"
      :key="def"
      @click="emit('add', def)"
      :class="{ 'incompatible-data-type': !compatible }"
    >

      <BTooltip
        teleport-to="body"
        variant="dark"
      >
        <template #target>
          <span v-for="cssClass in inputColorCssClass" :class="'badge rounded-pill ' + cssClass">&bull;</span>
        </template>
        Input: {{ inputNames.join(', ') }}
      </BTooltip>
      <span class="mx-2">
        {{ displayName }}
      </span>

      <BTooltip
        teleport-to="body"
        variant="dark"
      >
        <template #target>
          <span :class="'badge rounded-pill ' + outputColorCssClass">&bull;</span>
        </template>
        Output: {{ outputName }}
      </BTooltip>

    </BDropdownItem>

  </BDropdown>
</template>
<style lang="scss">
.incompatible-data-type {
  opacity: 0.5
}
</style>