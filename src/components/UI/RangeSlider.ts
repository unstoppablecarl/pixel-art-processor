import type { ConfigKeyAdapter } from '../../lib/util/object-key-serialization.ts'

export type RangeSliderSettings = {
  value: number,
  min: number,
  max: number,
  step: number,
}

export function rangeSliderConfig(
  {
    min = 0,
    max = 100,
    step = 1,
    value,
  }: {
    value: number,
    min?: number,
    max?: number,
    step?: number,
  },
): RangeSliderSettings {
  return {
    min,
    max,
    step,
    value,
  }
}

export const rangeSliderConfigAdapter: ConfigKeyAdapter = {
  serialize({ min, max, value, step }: RangeSliderSettings) {
    return { min, max, value, step }
  },
}