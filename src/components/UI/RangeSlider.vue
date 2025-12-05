<script setup lang="ts">
import { BCollapse } from 'bootstrap-vue-next'
import {
  computed,
  getCurrentInstance,
  onMounted,
  onUnmounted,
  readonly,
  ref,
  watch,
  type WritableComputedRef,
} from 'vue'
import type { RangeSliderConfig } from './RangeSlider.ts'

const {
  id,
  label,
  min: p_min,
  max: p_max,
  step: p_step,
  value: p_value,
  expandStep = 10,
  expandDelay = 100,
  decimals = 0,
  canBeNegative = false,
  canResetDefaults = true,
  defaults,
} = defineProps<{
  id: string,
  label: string,

  value: number,
  min?: number,
  max?: number,
  step?: number,

  defaults?: Partial<RangeSliderConfig>,

  decimals?: number,
  expandStep?: number,
  expandDelay?: number,
  canBeNegative?: boolean,
  canResetDefaults?: boolean,
}>()

const DEFAULTS = readonly({
  min: 0,
  max: 100,
  value: 50,
  step: 1,
  ...defaults,
})

const m_value = defineModel<number>('value')
const m_min = defineModel<number>('min')
const m_max = defineModel<number>('max')
const m_step = defineModel<number>('step')

const instance = getCurrentInstance()
const hasVModel = (key: string) => !!instance?.vnode?.props?.['onUpdate:' + key]

const canEditMin = hasVModel('min')
const canEditMax = hasVModel('max')
const canEditStep = hasVModel('step')

const value = computed({
  get: () => m_value.value ?? p_value ?? DEFAULTS.value,
  set: (v) => m_value.value = v,
}) as WritableComputedRef<number>

const min = computed({
  get: () => m_min.value ?? p_min ?? DEFAULTS.min,
  set: (v) => m_min.value = v,
}) as WritableComputedRef<number>

const max = computed({
  get: () => m_max.value ?? p_max ?? DEFAULTS.max,
  set: (v) => m_max.value = v,
}) as WritableComputedRef<number>

const step = computed({
  get: () => m_step.value ?? p_step ?? DEFAULTS.step,
  set: (v) => m_step.value = v,
}) as WritableComputedRef<number>

const isDragging = ref(false)
let expandInterval: number | null = null

const expandMin = (): void => {
  if (!canEditMin) return

  min.value -= expandStep
  if (!canBeNegative) {
    min.value = Math.max(min.value, 0)
  }

  value.value = min.value
}

const expandMax = (): void => {
  if (!canEditMax) return

  max.value += expandStep
  value.value = max.value
}

const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const val = Number(target.value)
  value.value = val

  if (!isDragging.value) return

  // Check if at minimum
  if (val <= min.value && !expandInterval) {
    expandInterval = window.setInterval(expandMin, expandDelay)
  }
  // Check if at maximum
  else if (val >= max.value && !expandInterval) {
    expandInterval = window.setInterval(expandMax, expandDelay)
  }
  // Stop expanding if moved away from edges
  else if (val > min.value && val < max.value && expandInterval) {
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
  if (canEditMin) min.value = DEFAULTS.min
  if (canEditMax) max.value = DEFAULTS.max
  if (canEditStep) step.value = DEFAULTS.step

  value.value = DEFAULTS.value
}

watch([min, max], () => {
  if (value.value < min.value) value.value = min.value
  if (value.value > max.value) value.value = max.value
})

onMounted(() => {
  min.value = Math.min(min.value, value.value)
  max.value = Math.max(max.value, value.value)
})

onUnmounted(() => {
  if (expandInterval) {
    clearInterval(expandInterval)
  }
})

const settingsVisible = ref(false)

function toggleSettings() {
  settingsVisible.value = !settingsVisible.value
}
</script>
<template>
  <div>
    <div class="d-flex">
      <span class="flex-grow-1">{{ label }} {{ Number(value).toFixed(decimals) }}</span>

      <div class="">
        <div class="badge badge-dark">
          <span class="text-muted text-uppercase">
            range:
          </span>
          {{ min }} - {{ max }}
        </div>
      </div>

      <div class="ms-1">
        <button
          role="button"
          :class="`btn btn-xs d-inline-block ${settingsVisible ? 'btn-secondary' : 'btn-dark'}`"
          @click="toggleSettings()"
        >
          {{ settingsVisible ? 'Close' : 'Edit' }}
        </button>
      </div>
    </div>

    <BCollapse id="collapse-1" v-model="settingsVisible">
      <div class="card my-2">
        <div class="card-header text-bg-dark d-flex">
          <div class="flex-grow-1">
            Settings
          </div>
          <button
            v-if="canResetDefaults"
            role="button"
            class="btn btn-xs btn-secondary"
            @click="reset()"
          >
            Reset To Defaults
          </button>
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
                    :disabled="!canEditStep"
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
                    :disabled="!canEditMin"
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
                    :disabled="!canEditMax"
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

  </div>
</template>
<style scoped lang="scss">
.range-label {
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5)
}
</style>