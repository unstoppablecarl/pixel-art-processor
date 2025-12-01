import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { shallowReactive, type ShallowReactive } from 'vue'
import type { AnyStepContext, Step, StepRef } from '../src/lib/pipeline/Step'
import type { StepRunnerRaw } from '../src/lib/pipeline/StepHandler'
import { makeStepRegistry, STEP_REGISTRY_INJECT_KEY } from '../src/lib/pipeline/StepRegistry'
import { useStepHandler } from '../src/lib/pipeline/useStepHandler'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import { createPersistedState } from '../src/lib/store/_pinia-persist-plugin'
import { useStepStore } from '../src/lib/store/step-store'
import { STEP_DATA_TYPES, STEP_DEFINITIONS, type StepDataTypeInstance } from '../src/steps'

function makeAppContext(cb: () => void) {

  const App = {
    setup() {

    },
    template: `
    `,
  }

  let pinia = createPinia()
  pinia.use(createPersistedState())

  const wrapper = mount(App, {
    global: {
      plugins: [pinia],
      provide: {
        [STEP_REGISTRY_INJECT_KEY]: makeStepRegistry(STEP_DEFINITIONS, STEP_DATA_TYPES),
      },
    },
  })

  setActivePinia(pinia)
  return wrapper
}

describe('basic type testing', async () => {
  it('its types', async () => {

    makeAppContext(() => {

      const store = useStepStore()
      const newStep = store.add('INPUT_MASK')

      type C = typeof configRaw
      type RC = ShallowReactive<C>

      type I = HeightMap | BitMask
      type O = NormalMap
      const configRaw = {
        maskImageData: null as null | ImageData,
      }

      const step = useStepHandler(newStep.id, {
        inputDataTypes: [HeightMap, BitMask],
        outputDataType: NormalMap,
        config() {
          return shallowReactive(configRaw)
        },
        run({ config, inputData }) {
          expectTypeOf(config).toExtend<ShallowReactive<C>>()
          expectTypeOf(inputData).toExtend<BitMask | HeightMap | null>()

          if (!config.maskImageData) return

          const bitMask = new NormalMap(1, 1)

          return {
            preview: config.maskImageData,
            output: bitMask,
          }
        },
        prevOutputToInput(input) {
          expectTypeOf(input).toEqualTypeOf<StepDataTypeInstance | null>()
          // input is inferred as StepDataTypeInstance | null
          // return type is inferred as Foo | Bar | null
          return input as HeightMap | BitMask | null
        },
      })

      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toEqualTypeOf<StepRunnerRaw<RC, I, O>>()
      expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<(outputData: StepDataTypeInstance | null) => I | null>()
      expectTypeOf(step.handler.config()).toEqualTypeOf<ShallowReactive<{
        maskImageData: null | ImageData,
      }>>()

      expectTypeOf(step.config).toEqualTypeOf<ShallowReactive<{
        maskImageData: null | ImageData,
      }>>()

      expectTypeOf(step).toExtend<StepRef<AnyStepContext>>()

    })
  })

  it('test case 2', () => {
    makeAppContext(() => {
      const store = useStepStore()
      const newStep = store.add('INPUT_MASK')

      type C = {
        normalMapStrength: number,
      }
      type RC = ShallowReactive<C>

      type I = HeightMap
      type O = NormalMap

      const step = useStepHandler(newStep.id, {
        inputDataTypes: [HeightMap],
        outputDataType: NormalMap,
        config() {
          return shallowReactive({
            normalMapStrength: 1.5,
          })
        },
        run({ config, inputData }) {
          if (!inputData) return

          return {
            output: inputData.toNormalMap(config.normalMapStrength),
            preview: inputData.toImageData(),
          }
        },
      })

      expectTypeOf(step.handler.run).toEqualTypeOf<StepRunnerRaw<RC, I, O>>()
      expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<(outputData: StepDataTypeInstance | null) => I | null>()
      expectTypeOf(step.handler.config()).toEqualTypeOf<ShallowReactive<{
        normalMapStrength: number,
      }>>()

      expectTypeOf(step.config).toEqualTypeOf<ShallowReactive<{
        normalMapStrength: number,
      }>>()

      expectTypeOf(step).toExtend<Step<AnyStepContext>>()
    })
  })
})