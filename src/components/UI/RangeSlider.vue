<script setup lang="ts">
import { BCollapse } from 'bootstrap-vue-next'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { RangeSliderSettings } from './RangeSlider.ts'

const {
  id,
  label,
  expandStep = 10,
  expandDelay = 100,
  decimals = 0,
  defaults,
  canBeNegative = false,
} = defineProps<{
  id: string,
  label: string,
  decimals?: number,
  expandStep?: number,
  expandDelay?: number,
  defaults: RangeSliderSettings,
  canBeNegative?: boolean
}>()

const value = defineModel<number>('value', { required: true })
const min = defineModel<number>('min', { required: true })
const max = defineModel<number>('max', { required: true })
const step = defineModel<number>('step', { required: true })

const isDragging = ref(false)
let expandInterval: number | null = null

const expandMin = (): void => {

  min.value! -= expandStep
  if (!canBeNegative) {
    min.value = Math.max(min.value, 0)
  }

  value.value = min.value
}

const expandMax = (): void => {
  max.value! += expandStep
  value.value = max.value
}

const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const val = Number(target.value)
  value.value = val

  if (!isDragging.value) return

  // Check if at minimum
  if (val <= min.value! && !expandInterval) {
    expandInterval = window.setInterval(expandMin, expandDelay)
  }
  // Check if at maximum
  else if (val >= max.value! && !expandInterval) {
    expandInterval = window.setInterval(expandMax, expandDelay)
  }
  // Stop expanding if moved away from edges
  else if (val > min.value! && val < max.value! && expandInterval) {
    clearInterval(expandInterval)
    expandInterval = null
  }
}

const startDragging = (): void => {
  isDragging.value = true
}

const stopDragging = (): void => {
  isDragging.value = false
  if (expandInterval) {
    clearInterval(expandInterval)
    expandInterval = null
  }
}

const reset = (): void => {
  min.value = defaults.min
  max.value = defaults.max
  step.value = defaults.step
  value.value = defaults.value

}

watch([min, max], () => {
  if (value.value < min.value!) value.value = min.value!
  if (value.value > max.value!) value.value = max.value!
})

onMounted(() => {
  min.value = Math.min(min.value!, value.value!)
  max.value = Math.max(max.value!, value.value!)
})

onUnmounted(() => {
  if (expandInterval) {
    clearInterval(expandInterval)
  }
})

const settingsVisible = ref(false)

function closeSettings() {
  settingsVisible.value = false
}

function openSettings() {
  settingsVisible.value = true
}
</script>
<template>

  <div class="d-flex">
    <span class="flex-grow-1">{{ label }} {{ Number(value).toFixed(decimals) }}</span>

    <div class="">
      <div class="badge badge-dark">
        <span class="text-muted text-uppercase">
          range:
        </span>

        {{ min }}- {{ max }}
      </div>
    </div>

    <div class="ms-1">
      <button role="button" class="btn btn-xs btn-dark d-inline-block" @click="openSettings()">Edit</button>
    </div>
  </div>

  <BCollapse id="collapse-1" v-model="settingsVisible">
    <div class="card my-2">
      <div class="card-header text-bg-dark d-flex">
        <div class="flex-grow-1">

          Settings
        </div>
        <button role="button" class="btn btn-xs btn-secondary me-1" @click="reset()">Reset To Defaults</button>

        <button role="button" class="btn btn-secondary btn-xs" @click="closeSettings()">Close</button>
      </div>

      <div class="card-body">

        <div class="row gx-0">
          <div class="col-6">
            <div class="row pt-2 gx-0">

              <label class="form-label col-form-label col-4 text-end pe-2" :for="`${id}-value-manual`">Value</label>
              <div class="col-8">
                <input
                  :id="`${id}-value-manual`"
                  class="form-control form-control-sm"
                  type="number"
                  :step="step"
                  v-model="value"
                />
              </div>
            </div>
          </div>

          <div class="col">
            <div class="row pt-2 gx-0">
              <label class="form-label col-form-label col-4 text-end pe-2" :for="`${id}-step-manual`">Step</label>
              <div class="col-8">
                <input
                  :id="`${id}-step-manual`"
                  class="form-control form-control-sm"
                  type="number"
                  v-model="step"
                />
              </div>
            </div>
          </div>
        </div>


        <div class="row gx-0">
          <div class="col">

            <div class="row pt-2 gx-0">
              <label class="form-label col-form-label col-4 text-end pe-2" :for="`${id}-min-manual`">Min</label>
              <div class="col-8">
                <input
                  :id="`${id}-min-manual`"
                  class="form-control form-control-sm"
                  type="number"
                  :step="step"
                  :max="max! - step!"
                  v-model="min"
                />
              </div>
            </div>
          </div>
          <div class="col">
            <div class="row pt-2 gx-0">
              <label class="form-label col-form-label col-4 text-end pe-2" :for="`${id}-max-manual`">Max</label>
              <div class="col-8">
                <input
                  :id="`${id}-max-manual`"
                  class="form-control form-control-sm"
                  type="number"
                  :step="step"
                  :min="min! + step!"
                  v-model="max"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </BCollapse>

  <input
    type="range"
    class="form-range"
    :step="step"
    :min="min"
    :max="max"
    :value="value"
    @input="handleInput"
    @mousedown="startDragging"
    @mouseup="stopDragging"
    @touchstart="startDragging"
    @touchend="stopDragging"
  />

</template>
<style scoped lang="scss">
.range-label {
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5)
}
</style>