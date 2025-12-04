// import { type ComputedRef } from 'vue'
import type { Optional } from '../../lib/_helpers.ts'
import type { ConfigKeyAdapter } from '../../lib/util/object-key-serialization.ts'

// export type RangeSliderSettings = {
//   value: number,
//   min: number | ComputedRef<number>,
//   max: number | ComputedRef<number>,
//   step: number | ComputedRef<number>,
//   minReadonly: boolean,
//   maxReadonly: boolean,
//   stepReadonly: boolean,
// }

export type RangeSliderSettings = {
  value: number,
  min: number,
  max: number,
  step: number,
}

export type RangeSliderDefaultSettings = {
  value: number,
  min: number,
  max: number,
  step: number,
  // minReadonly: boolean,
  // maxReadonly: boolean,
  // stepReadonly: boolean,
}


export function rangeSliderConfig(
  {
    min = 0,
    max = 100,
    step = 1,
    // minReadonly = false,
    // maxReadonly = false,
    // stepReadonly = false,
    value,
  }: Optional<RangeSliderSettings, 'min' | 'max' | 'step'
    // | 'minReadonly' | 'maxReadonly' | 'stepReadonly'
  >,
): RangeSliderSettings {
  return {
    min,
    max,
    step,
    // minReadonly,
    // maxReadonly,
    // stepReadonly,
    value,
  }
}

export const rangeSliderConfigAdapter: ConfigKeyAdapter = {
  serialize({ min, max, value, step }: RangeSliderSettings) {
    return { min, max, value, step }
  },
}