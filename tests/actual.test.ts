import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Component, type ShallowReactive, shallowReactive } from 'vue'
import { type StepContext, type StepRef, StepType } from '../src/lib/pipeline/Step'
import type { Config, IStepHandler, StepRunner } from '../src/lib/pipeline/StepHandler'
import { makeStepRegistry, STEP_REGISTRY_INJECT_KEY, useStepRegistry } from '../src/lib/pipeline/StepRegistry'
import { type ConfiguredStep, useStepHandler } from '../src/lib/pipeline/useStepHandler'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import { createPersistedState } from '../src/lib/store/_pinia-persist-plugin'
import { useStepStore } from '../src/lib/store/step-store'
import { type SerializedImageData } from '../src/lib/util/ImageData.ts'
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
      type OutputInstances = NormalMap

      type C = typeof configRaw
      type SC = {
        maskImageData: SerializedImageData | null,
      }
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
          expectTypeOf(config).toEqualTypeOf<ShallowReactive<C>>()
          expectTypeOf(inputData).toEqualTypeOf<InputInstance | null>()

          if (!config.maskImageData) return

          return {
            preview: config.maskImageData,
            output: new NormalMap(1, 1),
          }
        },
        // prevOutputToInput(input) {
        //   expectTypeOf(input).toEqualTypeOf<InputInstance | null>()
        //   return input
        // },
        // watcher(step, defaultWatcherTargets) {
        //   expectTypeOf(step).toEqualTypeOf<ConfiguredStep<T>>()
        //   return [
        //     ...defaultWatcherTargets,
        //   ]
        // },
      })

      it('creates correct step', () => {
        expectTypeOf(step).toEqualTypeOf<ConfiguredStep<T>>()
        expectTypeOf(step.outputPreview).toEqualTypeOf<ImageData | ImageData[] | null>()
        expectTypeOf(step.inputData).toEqualTypeOf<InputInstance | null>()

        // @TODO fix separate cases for normal/fork steps
        // should be the following
        // expectTypeOf(step.outputData).toEqualTypeOf<OutputInstances | null>()

        const step: ConfiguredStep<
          StepContext<
            Config,
            Config,
            ShallowReactive<{
              maskImageData: ImageData | null
            }>,
            readonly [typeof HeightMap, typeof BitMask],
            typeof NormalMap
          >,
          StepRunner<StepContext<Config, Config, ShallowReactive<{
            maskImageData: ImageData | null
          }>,
            readonly [typeof HeightMap, typeof BitMask],
            typeof NormalMap
          >>>
          = 0

        expectTypeOf(step.outputData).toEqualTypeOf<OutputInstances | OutputInstances[] | null>()
      })

      it('creates correct config', () => {
        expectTypeOf(step.config).toEqualTypeOf<RC>()
      })

      it('creates correct handler', () => {

        // cannot test whole object like this because of tuple reasons
        // expectTypeOf(step.handler).toEqualTypeOf<IStepHandler<T>>()

        expect(step.handler).to.not.eq(undefined)
        expectTypeOf(step.handler.config).toEqualTypeOf<() => RC>()
        // expectTypeOf(step.handler.run).toEqualTypeOf<StepRunner<T>>()
        // expectTypeOf(step.handler.run).toExtend<StepRunner<T>>()
        // expectTypeOf(step.handler.run).toExtend<StepRunner<T>>()

        expectTypeOf(step.handler.inputDataTypes).toEqualTypeOf<IStepHandler<T, unknown>['inputDataTypes']>()
        expectTypeOf(step.handler.outputDataType).toEqualTypeOf<IStepHandler<T, unknown>['outputDataType']>()

        expectTypeOf(step.handler.watcher).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['watcher']
        >()
        expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['serializeConfig']
        >()
        expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['deserializeConfig']
        >()
        expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['loadConfig']
        >()
        expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['prevOutputToInput']
        >()
        expectTypeOf(step.handler.validateInputType).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['validateInputType']
        >()
        expectTypeOf(step.handler.validateInput).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['validateInput']
        >()
        expectTypeOf(step.handler.serializeConfigKeys).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['serializeConfigKeys']
        >()
        expectTypeOf(step.handler.deserializeConfigKeys).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['deserializeConfigKeys']
        >()

        type X = IStepHandler<T, StepRunner<T>>['configKeyAdapters']

        expectTypeOf(step.handler.configKeyAdapters).toEqualTypeOf<
          IStepHandler<T, StepRunner<T>>['configKeyAdapters'] | undefined
        >()

        expectTypeOf(step.handler.config()).toEqualTypeOf<RC>()
        expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<(outputData: StepDataTypeInstance | null) => InputInstance | null>()
        expectTypeOf(step.handler.serializeConfig).returns.toEqualTypeOf<SC>()
        expectTypeOf(step.handler.deserializeConfig).returns.toEqualTypeOf<C>()
      })

      expectTypeOf<keyof typeof step.handler>().toEqualTypeOf<keyof IStepHandler<T>>()

      expectTypeOf(step.config).toEqualTypeOf<ShallowReactive<{
        maskImageData: null | ImageData,
      }>>()

      expectTypeOf(step).toExtend<StepRef>()
    })
  })

  // it('useStepHandler serialize/deserialize config', async () => {
  //
  //   makeAppContext(() => {
  //
  //     const inputDataTypes = [HeightMap, BitMask] as const
  //     const outputDataType = NormalMap
  //     type InputInstance = HeightMap | BitMask
  //
  //     type C = typeof configRaw
  //     type SC = {
  //       maskImageData: SerializedImageData | null,
  //     }
  //     type RC = ShallowReactive<C>
  //     type I = typeof inputDataTypes
  //     type O = typeof outputDataType
  //     type T = StepContext<C, C, RC, I, O>
  //
  //     const stepDef = defineStep({
  //       def: 'foo',
  //       inputDataTypes,
  //       outputDataType,
  //     })
  //
  //     const store = useStepStore()
  //     const newStep = store.add(stepDef.def)
  //
  //     const configRaw = {
  //       maskImageData: null as null | ImageData,
  //     } satisfies Config
  //
  //     const step = useStepHandler(newStep.id, {
  //       inputDataTypes,
  //       outputDataType,
  //       config() {
  //         return shallowReactive(configRaw)
  //       },
  //       run({ config, inputData }) {
  //         expectTypeOf(config).toEqualTypeOf<ShallowReactive<C>>()
  //         expectTypeOf(inputData).toEqualTypeOf<InputInstance | null>()
  //
  //         if (!config.maskImageData) return
  //
  //         return {
  //           preview: config.maskImageData,
  //           output: new NormalMap(1, 1),
  //         }
  //       },
  //       serializeConfig(config) {
  //         expectTypeOf(config).toEqualTypeOf<C>()
  //         return {
  //           ...config,
  //           maskImageData: serializeImageData(config.maskImageData),
  //         }
  //       },
  //       deserializeConfig(config) {
  //         expectTypeOf(config).toEqualTypeOf<SC>()
  //
  //         return {
  //           ...config,
  //           maskImageData: deserializeImageData(config.maskImageData),
  //         }
  //       },
  //     })
  //
  //     expectTypeOf(step).toEqualTypeOf<ConfiguredStep<T> & NormalStep<T>>()
  //
  //     expect(step.handler).to.not.eq(undefined)
  //     expectTypeOf<keyof typeof step.handler>().toEqualTypeOf<keyof IStepHandler<T>>()
  //
  //     expectTypeOf(step.handler.inputDataTypes).toEqualTypeOf<IStepHandler<T>['inputDataTypes']>()
  //     expectTypeOf(step.handler.outputDataType).toEqualTypeOf<IStepHandler<T>['outputDataType']>()
  //
  //     expectTypeOf(step.handler.run).toExtend<StepRunner<T> | ForkStepRunner<T>>()
  //     expectTypeOf(step.handler.run).toExtend<StepRunner<T>>()
  //
  //     expectTypeOf(step.handler.config()).toEqualTypeOf<RC>()
  //     expectTypeOf(step.config).toEqualTypeOf<RC>()
  //     expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<(outputData: StepDataTypeInstance | null) => InputInstance | null>()
  //     expectTypeOf(step.handler.serializeConfig).returns.toEqualTypeOf<SC>()
  //     expectTypeOf(step.handler.deserializeConfig).returns.toEqualTypeOf<C>()
  //
  //     expectTypeOf(step.config).toEqualTypeOf<ShallowReactive<{
  //       maskImageData: null | ImageData,
  //     }>>()
  //
  //     expectTypeOf(step).toExtend<StepRef<T>>()
  //   })
  // })
  //
  // it('useStepHandler with 1 input type', () => {
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
  //     })
  //
  //     const store = useStepStore()
  //     const newStep = store.add(stepDef.def)
  //
  //     const step = useStepHandler(newStep.id, {
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
  //
  //     expectTypeOf(step.handler.run).toExtend<StepRunner<T>>()
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