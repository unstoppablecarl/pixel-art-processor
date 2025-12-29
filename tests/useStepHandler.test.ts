import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Component, type ShallowReactive, shallowReactive } from 'vue'
import type { StepValidationError } from '../src/lib/errors.ts'
import {
  type AnyStepContext,
  type StepContext,
  type StepInputTypesToInstances,
  StepType,
} from '../src/lib/pipeline/Step'
import type {
  IStepHandler,
  StepHandlerOptions,
  StepHandlerOptionsInfer,
  WatcherTarget,
} from '../src/lib/pipeline/StepHandler'
import { makeStepRegistry, STEP_REGISTRY_INJECT_KEY, useStepRegistry } from '../src/lib/pipeline/StepRegistry'
import type { NormalStepRunner, NormalStepRunnerOutput } from '../src/lib/pipeline/StepRunner.ts'
import { type ConfiguredStep, useStepHandler } from '../src/lib/pipeline/useStepHandler'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import { createPersistedState } from '../src/lib/store/_pinia-persist-plugin'
import { useStepStore } from '../src/lib/store/step-store.ts'
import { deserializeImageData, type SerializedImageData, serializeImageData } from '../src/lib/util/ImageData.ts'
import type { MaybePromise } from '../src/lib/util/misc.ts'
import { STEP_DATA_TYPES, STEP_DEFINITIONS, type StepDataType } from '../src/steps'

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

  makeAppContext(() => {

    const inputDataTypes = [HeightMap, BitMask] as const
    const outputDataType = NormalMap

    type InputInstances = HeightMap | BitMask
    type OutputInstance = NormalMap

    const configRaw = {
      maskImageData: null as null | ImageData,
    }

    type C = typeof configRaw
    type SC = {
      maskImageData: SerializedImageData | null,
    }
    type RC = ShallowReactive<C>
    type I = typeof inputDataTypes
    type O = typeof outputDataType

    const stepDef = defineStep({
      def: 'foo',
      inputDataTypes,
      outputDataType,
    })

    const store = useStepStore()
    const newStep = store.add(stepDef.def)
    const step = useStepHandler(newStep.id, {
      inputDataTypes,
      outputDataType,
      config() {
        return {
          ...configRaw,
        }
      },
      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()
        return shallowReactive(defaults)
      },

      serializeConfig(config) {
        expectTypeOf(config).toEqualTypeOf<C>()
        return {
          ...config,
          maskImageData: serializeImageData(config.maskImageData),
        }
      },
      deserializeConfig(config) {
        expectTypeOf(config).toExtend<SC>()

        return {
          ...config,
          maskImageData: deserializeImageData(config.maskImageData),
        }
      },

      run({ config, inputData }) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()

        if (!config.maskImageData) return

        return {
          preview: config.maskImageData,
          output: new NormalMap(1, 1),
        }
      },
      prevOutputToInput(input) {
        expectTypeOf(input).toEqualTypeOf<InputInstances | null>()
        return input
      },
      watcher(step, defaultWatcherTargets) {
        type T = typeof step extends ConfiguredStep<infer U> ? U : never
        expectTypeOf(step).toExtend<ConfiguredStep<T>>()
        expectTypeOf(step.config).toEqualTypeOf<ConfiguredStep<T>['config']>()

        expectTypeOf(defaultWatcherTargets).toExtend<WatcherTarget[]>()

        return [
          ...defaultWatcherTargets,
        ]
      },

    })
    type T = typeof step extends ConfiguredStep<infer U> ? U : never

    it('creates correct step', () => {
      expectTypeOf<T>().toEqualTypeOf<StepContext<C, SC, RC, I, O>>()
      expectTypeOf(step).not.toEqualTypeOf<ConfiguredStep<AnyStepContext>>()
      expectTypeOf(step).toExtend<ConfiguredStep<StepContext<C, SC, RC, I, O>>>()

      expectTypeOf(step).toEqualTypeOf<ConfiguredStep<T, NormalStepRunner<T>>>()
      expectTypeOf(step.outputPreview).toEqualTypeOf<ImageData | ImageData[] | null>()
      expectTypeOf(step.inputData).toEqualTypeOf<InputInstances | null>()
      expectTypeOf(step.outputData).toEqualTypeOf<OutputInstance | OutputInstance[] | null>()
    })

    it('creates correct handler', () => {
      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toEqualTypeOf<
        IStepHandler<T, NormalStepRunner<T>>['run']
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<
        NormalStepRunner<T>
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<
        ({ config, inputData }: {
          config: RC,
          inputData: InputInstances | null
        }) => MaybePromise<NormalStepRunnerOutput<OutputInstance>>
      >()
      expectTypeOf(step.handler.run).parameters.toEqualTypeOf<[
        { config: RC, inputData: InputInstances | null }
      ]>()
      expectTypeOf(step.handler.run).returns.toEqualTypeOf<
        MaybePromise<NormalStepRunnerOutput<OutputInstance>>
      >()

      expectTypeOf(step.handler.config).toEqualTypeOf<
        IStepHandler<T>['config']
      >()
      expectTypeOf(step.handler.config).toEqualTypeOf<
        () => C
      >()

      expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
        IStepHandler<T>['reactiveConfig']
      >()
      expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
        (defaults: C) => RC
      >()

      expectTypeOf(step.handler.watcher).toEqualTypeOf<
        IStepHandler<T, NormalStepRunner<T>>['watcher']
      >()
      expectTypeOf(step.handler.watcher).toEqualTypeOf<
        (step: ConfiguredStep<T, NormalStepRunner<T>>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]
      >()

      expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
        IStepHandler<T>['serializeConfig']
      >()
      expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
        ((config: C) => SC)
      >()

      expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
        IStepHandler<T>['deserializeConfig']
      >()
      expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
        ((config: SC) => C)
      >()

      expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
        IStepHandler<T>['loadConfig']
      >()
      expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
        (config: RC, serializedConfig: SC) => void
      >()

      expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<
        IStepHandler<T>['prevOutputToInput']
      >()
      expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<
        ((output: InputInstances | null) => InputInstances | null)
      >()

      expectTypeOf(step.handler.validateInputType).toEqualTypeOf<
        IStepHandler<T>['validateInputType']
      >()
      expectTypeOf(step.handler.validateInputType).toEqualTypeOf<
        ((typeFromPrevOutput: InputInstances, inputDataTypes: T['InputConstructors']) => StepValidationError[])
      >()

      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        IStepHandler<T>['validateInput']
      >()
      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        (inputData: InputInstances) => StepValidationError[]
      >()

      expectTypeOf(step.handler.inputDataTypes).toEqualTypeOf<IStepHandler<T>['inputDataTypes']>()
      expectTypeOf(step.handler.outputDataType).toEqualTypeOf<IStepHandler<T>['outputDataType']>()
    })
  })
})

describe('StepHandlerOptionsInfer inference', () => {
  type RawConfig = { foo: number }
  type SerializedConfig = { foo: number }
  type RC = { foo: number }
  type A = typeof BitMask
  type B = typeof NormalMap
  type C = typeof HeightMap

  type T = StepContext<
    RawConfig,
    SerializedConfig,
    RC,
    readonly [A, B],
    C
  >

  type Infer = StepHandlerOptionsInfer<
    RawConfig,
    SerializedConfig,
    RC,
    readonly [A, B],
    C,
    NormalStepRunner<T>
  >

  it('preserves the generic parameters', () => {
    expectTypeOf<Infer>().toExtend<
      StepHandlerOptions<T, NormalStepRunner<T>>
    >()

    expectTypeOf<Infer['config']>().returns.toEqualTypeOf<RawConfig>()
    expectTypeOf<Infer['reactiveConfig']>().returns.toEqualTypeOf<RC>()
    expectTypeOf<Infer['run']>().toEqualTypeOf<NormalStepRunner<T>>

    expectTypeOf<Infer['run']>().parameters.toEqualTypeOf<[{
      config: RC
      inputData: StepInputTypesToInstances<[A, B]> | null
    }]>()

    expectTypeOf<Infer['run']>().parameters.toEqualTypeOf<[{
      config: T['RC']
      inputData: StepInputTypesToInstances<T['InputConstructors']> | null
    }]>()

  })

})
