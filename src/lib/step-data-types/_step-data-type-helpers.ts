import type { StepDataTypeInstance } from '../../steps.ts'
import { copyImageData } from '../util/ImageData.ts'
import { BaseDataStructure } from './BaseDataStructure.ts'

export function copyStepDataOrNull<T extends StepDataTypeInstance | null>(target: T): T {
  if (target === null) {
    return null as T
  }

  if (target instanceof ImageData) {
    return copyImageData(target) as unknown as T
  }

  if (target instanceof BaseDataStructure) {
    return target.copy() as unknown as T
  }

  // Safety net
  console.error('Invalid Step Data Type', target)
  throw new Error('Invalid Step Data Type')
}