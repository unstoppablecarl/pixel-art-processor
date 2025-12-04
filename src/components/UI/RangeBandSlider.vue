<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

interface DualRangeProps {
  min?: number
  max?: number
  step?: number
  minValue?: number
  maxValue?: number
  label?: string
  showInputs?: boolean
  showOutput?: boolean
  prefix?: string
  suffix?: string
  id?: string
}

interface RangeChangeEvent {
  min: number
  max: number
}

const props = withDefaults(defineProps<DualRangeProps>(), {
  min: 0,
  max: 100,
  step: 1,
  minValue: 0,
  maxValue: 100,
  label: '',
  showInputs: false,
  showOutput: true,
  prefix: '',
  suffix: '',
  id: 'dual-range',
})

const emit = defineEmits<{
  (e: 'update:minValue', value: number): void
  (e: 'update:maxValue', value: number): void
  (e: 'change', payload: RangeChangeEvent): void
}>()

const internalMinValue = ref(props.minValue)
const internalMaxValue = ref(props.maxValue)
const sliderContainer = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const filled = ref<HTMLElement | null>(null)
const minThumb = ref<HTMLElement | null>(null)
const maxThumb = ref<HTMLElement | null>(null)
const activeThumb = ref<HTMLElement | null>(null)
const isMinThumb = ref<boolean>(false)
const isDragging = ref<boolean>(false)
let dragRaf: number | null = null
let trackRect: DOMRect | null = null

const minPos = computed(() => {
  return ((internalMinValue.value - props.min) / (props.max - props.min)) * 100
})

const maxPos = computed(() => {
  return ((internalMaxValue.value - props.min) / (props.max - props.min)) * 100
})

const filledStyle = computed(() => {
  return {
    left: `${minPos.value}%`,
    width: `${maxPos.value - minPos.value}%`,
    // left: `calc(${minPos.value}% + 0.5rem)`,
    // width: `calc(${maxPos.value - minPos.value}% - 0.5rem)`,
  }
})

watch(() => props.minValue, (newVal) => {
  internalMinValue.value = newVal
  syncValues()
})

watch(() => props.maxValue, (newVal) => {
  internalMaxValue.value = newVal
  syncValues()
})

onMounted(() => {
  syncValues()
  nextTick(() => {
    updateTrackRect()
  })
})

onUnmounted(() => {
  if (dragRaf) cancelAnimationFrame(dragRaf)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', onDragEnd)
  // @ts-expect-error
  document.removeEventListener('touchmove', onDrag, { passive: false })
  document.removeEventListener('touchend', onDragEnd)
})

const updateTrackRect = (): void => {
  if (track.value) {
    trackRect = track.value.getBoundingClientRect()
  }
}

const handleMinInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  internalMinValue.value = parseFloat(target.value) || props.min
  syncValues()
}

const handleMaxInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  internalMaxValue.value = parseFloat(target.value) || props.max
  syncValues()
}

const handleMinChange = (event: Event): void => {
  const target = event.target as HTMLInputElement
  internalMinValue.value = parseFloat(target.value) || props.min
  syncValues()
  emit('update:minValue', internalMinValue.value)
}

const handleMaxChange = (event: Event): void => {
  const target = event.target as HTMLInputElement
  internalMaxValue.value = parseFloat(target.value) || props.max
  syncValues()
  emit('update:maxValue', internalMaxValue.value)
}

const syncValues = (): void => {
  // Ensure min <= max
  if (internalMinValue.value > internalMaxValue.value) {
    ;[internalMinValue.value, internalMaxValue.value] = [internalMaxValue.value, internalMinValue.value]
  }
  // Clamp values
  internalMinValue.value = Math.max(props.min, Math.min(props.max, internalMinValue.value))
  internalMaxValue.value = Math.max(props.min, Math.min(props.max, internalMaxValue.value))
  // Round to step
  internalMinValue.value = Math.round(internalMinValue.value / props.step) * props.step
  internalMaxValue.value = Math.round(internalMaxValue.value / props.step) * props.step

  // Update parent via v-model-like emits
  emit('update:minValue', internalMinValue.value)
  emit('update:maxValue', internalMaxValue.value)
  emit('change', { min: internalMinValue.value, max: internalMaxValue.value } as RangeChangeEvent)
}

const getValueFromPosition = (percent: number): number => {
  return props.min + (percent / 100) * (props.max - props.min)
}

const getPositionFromValue = (value: number): number => {
  return ((value - props.min) / (props.max - props.min)) * 100
}

const onThumbMousedown = (event: MouseEvent, isMin: boolean): void => {
  event.preventDefault()
  activeThumb.value = isMin ? minThumb.value : maxThumb.value
  isMinThumb.value = isMin
  isDragging.value = true
  updateTrackRect()
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', onDragEnd)
}

const onThumbTouchstart = (event: TouchEvent, isMin: boolean): void => {
  event.preventDefault()
  activeThumb.value = isMin ? minThumb.value : maxThumb.value
  isMinThumb.value = isMin
  isDragging.value = true
  updateTrackRect()
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

const onDrag = (event: MouseEvent | TouchEvent): void => {
  event.preventDefault()
  if (dragRaf) cancelAnimationFrame(dragRaf)

  dragRaf = requestAnimationFrame(() => {
    let clientX: number
    if ('touches' in event) {
      clientX = event.touches[0]!.clientX
    } else {
      clientX = (event as MouseEvent).clientX
    }

    if (!trackRect) {
      updateTrackRect()
      return
    }

    let x = clientX - trackRect.left
    let percent = Math.max(0, Math.min(100, (x / trackRect.width) * 100))

    // Clamp based on other thumb
    const otherPos = isMinThumb.value ? maxPos.value : minPos.value
    if (isMinThumb.value) {
      percent = Math.min(percent, otherPos)
    } else {
      percent = Math.max(percent, otherPos)
    }

    // Snap to step
    const rawValue = getValueFromPosition(percent)
    const snappedValue = Math.round(rawValue / props.step) * props.step
    percent = getPositionFromValue(snappedValue)

    if (isMinThumb.value) {
      internalMinValue.value = snappedValue
    } else {
      internalMaxValue.value = snappedValue
    }

    syncValues()
    dragRaf = null
  })
}

const onDragEnd = (): void => {
  if (dragRaf) cancelAnimationFrame(dragRaf)
  activeThumb.value = null
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', onDragEnd)
}
</script>
<template>
  <div class="range-container position-relative mb-3">
    <div class="d-flex">

      <label v-if="label" class="form-label flex-grow-1">{{ label }} {{ minValue }}-{{ maxValue }}</label>
      <div class="">
        <div class="badge badge-dark">
          <span class="text-muted text-uppercase">
            range:
          </span>
          {{ min }} - {{ max }}
        </div>
      </div>

    </div>
    <div ref="sliderContainer" class="slider-container position-relative w-100">
      <div ref="track" class="track position-relative">
        <div
          ref="filled"
          class="filled position-absolute"
          :style="filledStyle"
          :class="{ 'no-transition': isDragging }"
        ></div>
        <div class="thumb-container">
          <div
            ref="minThumb"
            class="thumb min-thumb position-absolute"
            :style="{ left: `${minPos}%` }"
            @mousedown="onThumbMousedown($event, true)"
            @touchstart="onThumbTouchstart($event, true)"
          ></div>
          <div
            ref="maxThumb"
            class="thumb max-thumb position-absolute"
            :style="{ left: `${maxPos}%` }"
            @mousedown="onThumbMousedown($event, false)"
            @touchstart="onThumbTouchstart($event, false)"
          ></div>
        </div>
      </div>
    </div>
    <!-- Value display (optional) -->
    <div v-if="showInputs" class="row g-2 mt-3">
      <div class="col-md-6">
        <label class="form-label" :for="`${id}-min-input`">Min:</label>
        <input
          type="number"
          :class="['form-control', 'min-input']"
          :id="`${id}-min-input`"
          :min="min"
          :max="max"
          :step="step"
          :value="internalMinValue"
          @input="handleMinInput"
          @change="handleMinChange"
        />
      </div>
      <div class="col-md-6">
        <label class="form-label" :for="`${id}-max-input`">Max:</label>
        <input
          type="number"
          :class="['form-control', 'max-input']"
          :id="`${id}-max-input`"
          :min="min"
          :max="max"
          :step="step"
          :value="internalMaxValue"
          @input="handleMaxInput"
          @change="handleMaxChange"
        />
      </div>
    </div>
  </div>
</template>
