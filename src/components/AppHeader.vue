<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useStepRegistry } from '../lib/pipeline/StepRegistry.ts'
import { useScaleStore } from '../lib/store/scale-store.ts'

const emit = defineEmits(['addStep'])
const store = useScaleStore()
const steps = computed(() => useStepRegistry().toArray())

const selected = ref('none')

watch(selected, async () => {
  if (selected.value === 'none') {
    return
  }
  emit('addStep', selected.value)
  await nextTick()
  selected.value = 'none'
})

</script>
<template>
  <div class="mb-3 px-1 pt-1 sticky-top app-header shadow">
    <h3 class="lead ps-3 py-2 d-inline-block">Pixel Art Processor</h3>
    <div class="float-end px-3 form-control form-control-sm w-auto p-0">
      <label class="form-label me-2" for="scale">Scale: {{ store.scale }}</label>
      <input type="range" id="scale" min="1" max="10" step="1" v-model.number="store.scale"
             class="form-range pt-3 d-inline-block w-auto" />
    </div>
    <div class="float-end">

      <select class="form-select me-2" aria-label="Default select example" v-model="selected">
        <option v-for="step in steps" :value="step.def" :key="step.def">{{ step.displayName }}</option>
        <option value="none">Add Step</option>
      </select>
    </div>
  </div>
</template>
<style lang="scss">
.app-header {
  background-color: var(--bs-body-bg);
  border-bottom: 1px solid var(--bs-border-color);
}
</style>