import { enableAutoUnmount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { afterEach, beforeEach } from 'vitest'
import { installStepRegistry, makeStepRegistry } from '../src/lib/pipeline/StepRegistry.ts'
import { STEP_DATA_TYPES, STEP_DEFINITIONS } from '../src/steps.ts'

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(undefined)
  installStepRegistry(makeStepRegistry(STEP_DEFINITIONS, STEP_DATA_TYPES))

})

if (typeof ImageData === 'undefined') {
  global.ImageData = class ImageData {
    data: Uint8ClampedArray
    width: number
    height: number

    constructor(width: number, height: number)
    constructor(data: Uint8ClampedArray, width: number, height?: number)
    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      height?: number,
    ) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth
        this.width = widthOrHeight
        this.height = height ?? dataOrWidth.length / 4 / widthOrHeight
      } else {
        this.width = dataOrWidth
        this.height = widthOrHeight
        this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4)
      }
    }
  } as any
}