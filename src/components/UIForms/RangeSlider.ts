import type { Optional } from '../../lib/_helpers.ts'

export type RangeSliderConfig = {
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
  }: Optional<RangeSliderConfig, 'min' | 'max' | 'step'>,
): RangeSliderConfig {
  return {
    min,
    max,
    step,
    value,
  }
}