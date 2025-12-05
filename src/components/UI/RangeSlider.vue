<script setup lang="ts">
import { BCollapse } from 'bootstrap-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { RangeSliderConfig } from './RangeSlider.ts'

interface IProps {
  id: string,
  label: string,
  decimals?: number,
  expandStep?: number,
  expandDelay?: number,
  value?: number,
  defaults?: RangeSliderConfig,
  canBeNegative?: boolean,
  canResetDefaults?: boolean,
}

type Props = IProps & (
  | { max: number; hardMax?: never }
  | { hardMax: number; max?: never }
  ) & (
  | { min: number; hardMin?: never }
  | { hardMin: number; min?: never }
  ) & (
  | { step: number; hardStep?: never }
  | { hardStep: number; step?: never }
  );

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
  hardMax,
  hardMin,
  hardStep,
  defaults = {
    min: 0,
    max: 100,
    value: 50,
    step: 1,
  },
} = defineProps<Props>()

const m_value = defineModel<number>('value')
const m_min = defineModel<number>('min')
const m_max = defineModel<number>('max')
const m_step = defineModel<number>('step')

if (__DEV__) {
  if (m_min.value !== undefined && hardMin !== undefined) {
    console.error('[RangeSlider] Cannot use both v-model:min and hardMin')
  }
  if (m_max.value !== undefined && hardMax !== undefined) {
    console.error('[RangeSlider] Cannot use both v-model:max and hardMax')
  }
  if (m_step.value !== undefined && hardStep !== undefined) {
    console.error('[RangeSlider] Cannot use both v-model:step and hardStep')
  }
}

const clamp = (val: number, minimum: number, maximum: number): number => {
  return Math.max(minimum, Math.min(maximum, val))
}

const value = computed({
  get: () => m_value.value ?? p_value ?? defaults.value,
  set: (v) => m_value.value = v,
})

const min = computed({
  get: () => hardMin ?? m_min.value ?? p_min ?? defaults.min,
  set: (v) => m_min.value = v,
})

const max = computed({
  get: () => hardMax ?? m_max.value ?? p_max ?? defaults.max,
  set: (v) => m_max.value = v,
})

const step = computed({
  get: () => hardStep ?? m_step.value ?? p_step ?? defaults.step,
  set: (v) => {
    const maxStep = max.value - min.value
    m_step.value = clamp(Math.abs(v), 0.0001, maxStep)
  },
})

const isDragging = ref(false)
let expandInterval: number | null = null

const expandMin = (): void => {
  min.value -= expandStep
  if (!canBeNegative) {
    min.value = Math.max(min.value, 0)
  }
  if (hardMin !== undefined) {
    min.value = Math.max(min.value, hardMin)
  }

  value.value = min.value
}

const expandMax = (): void => {
  max.value += expandStep
  if (hardMax !== undefined) {
    max.value = Math.min(max.value, hardMax)
  }
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
  min.value = defaults.min
  max.value = defaults.max
  step.value = defaults.step
  value.value = defaults.value
}

watch([min, max], () => {
  if (value.value < min.value) value.value = min.value
  if (value.value > max.value) value.value = max.value
})

onMounted(() => {
  min.value = Math.min(min.value, value.value)
  max.value = Math.max(max.value, value.value)
})

onMounted(() => {
  // Ensure range accommodates initial value
  const currentValue = value.value
  if (hardMin === undefined && currentValue < min.value) {
    min.value = currentValue
  }
  if (hardMax === undefined && currentValue > max.value) {
    max.value = currentValue
  }
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
        <button role="button" class="btn btn-xs btn-dark d-inline-block" @click="openSettings()">Edit</button>
      </div>
    </div>

    <BCollapse id="collapse-1" v-model="settingsVisible">
      <div class="card my-2">
        <div class="card-header text-bg-dark d-flex">
          <div class="flex-grow-1">
            Settings
          </div>
          <button v-if="canResetDefaults" role="button" class="btn btn-xs btn-secondary me-1" @click="reset()">Reset To
            Defaults
          </button>

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
                    :disabled="hardStep !== undefined"
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
                    :disabled="hardMin !== undefined"
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
                    :disabled="hardMax !== undefined"
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