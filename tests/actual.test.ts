import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Component, type ShallowReactive, shallowReactive } from 'vue'
import { type AnyStepContext, type Step, type StepContext, type StepRef, StepType } from '../src/lib/pipeline/Step'
import type { Config, ForkStepRunner, StepRunner, StepRunnerRaw } from '../src/lib/pipeline/StepHandler'
import { makeStepRegistry, STEP_REGISTRY_INJECT_KEY, useStepRegistry } from '../src/lib/pipeline/StepRegistry'
import { useStepHandler } from '../src/lib/pipeline/useStepHandler'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import { createPersistedState } from '../src/lib/store/_pinia-persist-plugin'
import { useStepStore } from '../src/lib/store/step-store'
import { STEP_DATA_TYPES, STEP_DEFINITIONS, type StepDataType, type StepDataTypeInstance } from '../src/steps'

function makeAppContext(cb: () => void) {

  const App = {
    setup() {
      cb()
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

function defineStep(
  {
    def,
    displayName = 'Testing',
    type = StepType.NORMAL,
    inputDataTypes,
    outputDataType,
  }: {
    def: string,
    displayName?: string,
    type?: StepType,
    inputDataTypes: readonly StepDataType[],
    outputDataType: StepDataType
  },
) {
  return useStepRegistry().defineStep({
    displayName,
    def,
    type,
    inputDataTypes,
    outputDataType,
    component: {} as unknown as Component,
  })
}

describe('step handler type testing', async () => {
  it('useStepHandler with 2 input types', async () => {

    makeAppContext(() => {

      const inputDataTypes = [HeightMap, BitMask] as const
      const outputDataType = NormalMap
      type InputInstance = HeightMap | BitMask

      type C = typeof configRaw
      type RC = ShallowReactive<C>
      type I = typeof inputDataTypes
      type O = typeof outputDataType
      type T = StepContext<C, C, RC, I, O>

      const stepDef = defineStep({
        def: 'foo',
        inputDataTypes,
        outputDataType,
      })

      const store = useStepStore()
      const newStep = store.add(stepDef.def)

      const configRaw = {
        maskImageData: null as null | ImageData,
      } satisfies Config

      const step = useStepHandler(newStep.id, {
        inputDataTypes,
        outputDataType,
        config() {
          return shallowReactive(configRaw)
        },
        run({ config, inputData }) {
          expectTypeOf(config).toExtend<ShallowReactive<C>>()
          expectTypeOf(inputData).toEqualTypeOf<InputInstance | null>()

          if (!config.maskImageData) return

          const normalMap = new NormalMap(1, 1)

          return {
            preview: config.maskImageData,
            output: normalMap,
          }
        },
        prevOutputToInput(input) {
          expectTypeOf(input).toEqualTypeOf<StepDataTypeInstance | null>()
          return input as InputInstance | null
        },
      })

      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toExtend<StepRunner<T> | ForkStepRunner<T>>()

      expectTypeOf(step.handler.run).toExtend<StepRunner<T>>()
      expectTypeOf(step.handler.run).toExtend<StepRunnerRaw<C, RC, I, O>>()

      expectTypeOf(step.handler.config()).toEqualTypeOf<RC>()
      expectTypeOf(step.config).toEqualTypeOf<RC>()
      expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<(outputData: StepDataTypeInstance | null) => InputInstance | null>()

      expectTypeOf(step.config).toEqualTypeOf<ShallowReactive<{
        maskImageData: null | ImageData,
      }>>()

      expectTypeOf(step).toExtend<StepRef>()
    })
  })

  it('useStepHandler with 1 input type', () => {
    makeAppContext(() => {

      const inputDataTypes = [HeightMap] as const
      const outputDataType = NormalMap
      const configRaw = {
        normalMapStrength: 9,
      } satisfies Config

      type InputInstance = HeightMap

      type C = typeof configRaw
      type RC = ShallowReactive<C>
      type I = typeof inputDataTypes
      type O = typeof outputDataType
      type T = StepContext<C, C, RC, I, O>

      const stepDef = defineStep({
        def: 'bar',
        inputDataTypes,
        outputDataType,
      })

      const store = useStepStore()
      const newStep = store.add(stepDef.def)

      const step = useStepHandler(newStep.id, {
        inputDataTypes,
        outputDataType: NormalMap,
        config() {
          return shallowReactive({
            normalMapStrength: 1.5,
          })
        },
        run({ config, inputData }) {
          if (!inputData) return

          expect(config.normalMapStrength).toEqual(1.5)
          return {
            output: inputData.toNormalMap(config.normalMapStrength),
            preview: inputData.toImageData(),
          }
        },
      })

      step.handler.run satisfies StepRunner<T>
      step.handler.run satisfies StepRunnerRaw<C, RC, I, O>

      expectTypeOf(step.handler.run).toExtend<StepRunner<T>>()
      expectTypeOf(step.handler.run).toExtend<StepRunnerRaw<C, RC, I, O>>()

      expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<(outputData: StepDataTypeInstance | null) => InputInstance | null>()
      expectTypeOf(step.handler.config()).toEqualTypeOf<ShallowReactive<{
        normalMapStrength: number,
      }>>()

      expectTypeOf(step.config).toEqualTypeOf<ShallowReactive<{
        normalMapStrength: number,
      }>>()

      expectTypeOf(step).toExtend<Step<AnyStepContext>>()
    })
  })

  // it('useForkStepHandler with 1 input type', () => {
  //   makeAppContext(() => {
  //
  //     const inputDataTypes = [HeightMap] as const
  //     const outputDataType = NormalMap
  //     const configRaw = {
  //       normalMapStrength: 9,
  //     } satisfies Config
  //
  //     type InputInstance = HeightMap
  //
  //     type C = typeof configRaw
  //     type RC = ShallowReactive<C>
  //     type I = typeof inputDataTypes
  //     type O = typeof outputDataType
  //     type T = StepContext<C, C, RC, I, O>
  //
  //     const stepDef = defineStep({
  //       def: 'bar',
  //       inputDataTypes,
  //       outputDataType,
  //       type: StepType.FORK,
  //     })
  //
  //     const store = useStepStore()
  //     const newStep = store.add(stepDef.def)
  //
  //     const step = useForkStepHandler(newStep.id, {
  //       inputDataTypes,
  //       outputDataType: NormalMap,
  //       config() {
  //         return shallowReactive({
  //           normalMapStrength: 1.5,
  //         })
  //       },
  //       run({ config, inputData }) {
  //         if (!inputData) return
  //
  //         expect(config.normalMapStrength).toEqual(1.5)
  //         return {
  //           output: inputData.toNormalMap(config.normalMapStrength),
  //           preview: inputData.toImageData(),
  //         }
  //       },
  //     })
  //
  //     step.handler.run satisfies StepRunner<T>
  //     step.handler.run satisfies StepRunnerRaw<C, RC, I, O>
  //
  //     expectTypeOf(step.handler.run).toExtend<StepRunner<T>>()
  //     expectTypeOf(step.handler.run).toExtend<StepRunnerRaw<C, RC, I, O>>()
  //
  //     expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<(outputData: StepDataTypeInstance | null) => InputInstance | null>()
  //     expectTypeOf(step.handler.config()).toEqualTypeOf<ShallowReactive<{
  //       normalMapStrength: number,
  //     }>>()
  //
  //     expectTypeOf(step.config).toEqualTypeOf<ShallowReactive<{
  //       normalMapStrength: number,
  //     }>>()
  //
  //     expectTypeOf(step).toExtend<Step<AnyStepContext>>()
  //   })
  // })
})