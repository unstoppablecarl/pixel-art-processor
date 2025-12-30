import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Component, type ShallowReactive, shallowReactive } from 'vue'
import { type AnyStepContext, type ConfiguredStep, type StepContext, StepType } from '../src/lib/pipeline/Step'
import type { IStepHandler, WatcherTarget } from '../src/lib/pipeline/StepHandler'
import { makeStepRegistry, STEP_REGISTRY_INJECT_KEY, useStepRegistry } from '../src/lib/pipeline/StepRegistry'
import type { ForkStepRunner, ForkStepRunnerOutput } from '../src/lib/pipeline/StepRunner.ts'
import { useStepForkHandler } from '../src/lib/pipeline/useStepHandler'
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
    const step = useStepForkHandler(newStep.id, {
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

      run({ config, inputData, branchCount }) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()
        expectTypeOf(branchCount).toEqualTypeOf<number>()

        if (!config.maskImageData) return

        return {
          preview: config.maskImageData,
          branchOutput: [new NormalMap(1, 1)],
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

      expectTypeOf(step).toEqualTypeOf<ConfiguredStep<T, ForkStepRunner<T>>>()
      expectTypeOf(step.outputPreview).toEqualTypeOf<ImageData | ImageData[] | null>()
      expectTypeOf(step.inputData).toEqualTypeOf<InputInstances | null>()
      expectTypeOf(step.outputData).toEqualTypeOf<OutputInstance | OutputInstance[] | null>()
    })

    it('creates correct handler', () => {
      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toEqualTypeOf<
        IStepHandler<T, ForkStepRunner<T>>['run']
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<
        ForkStepRunner<T>
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<
        ({ config, inputData, branchCount }: {
          config: RC,
          inputData: InputInstances | null,
          branchCount: number,
        }) => MaybePromise<ForkStepRunnerOutput<OutputInstance>>
      >()
      expectTypeOf(step.handler.run).parameters.toEqualTypeOf<[
        {
          config: RC,
          inputData: InputInstances | null,
          branchCount: number
        }
      ]>()
      expectTypeOf(step.handler.run).returns.toEqualTypeOf<
        MaybePromise<ForkStepRunnerOutput<OutputInstance>>
      >()

    })
  })
})