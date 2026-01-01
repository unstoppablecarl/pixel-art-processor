import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Component, type ShallowReactive, shallowReactive } from 'vue'
import type { StepValidationError } from '../src/lib/errors.ts'
import { type InitializedForkNode, type InitializedNode, type NodeDef, NodeType } from '../src/lib/pipeline/Node.ts'
import { type AnyStepContext, type StepContext, type StepInputTypesToInstances } from '../src/lib/pipeline/Step'
import type {
  IStepHandler,
  StepHandlerOptions,
  StepHandlerOptionsInfer,
  WatcherTarget,
} from '../src/lib/pipeline/StepHandler'
import { useStepRegistry } from '../src/lib/pipeline/StepRegistry.ts'
import type { ForkStepRunner, SingleRunnerOutput } from '../src/lib/pipeline/StepRunner.ts'
import { useForkHandler } from '../src/lib/pipeline/useStepHandler.ts'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import { createPersistedState } from '../src/lib/store/_pinia-persist-plugin'
import { type PipelineStore, usePipelineStore } from '../src/lib/store/pipeline-store.ts'
import { deserializeImageData, type SerializedImageData, serializeImageData } from '../src/lib/util/ImageData.ts'
import { type StepDataType } from '../src/steps'

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
    },
  })

  setActivePinia(pinia)
  return wrapper
}

function defineStep(
  {
    def,
    displayName = 'Testing',
    type = NodeType.STEP,
    inputDataTypes,
    outputDataType,
  }: {
    def: string,
    displayName?: string,
    type?: NodeType,
    inputDataTypes: readonly StepDataType[],
    outputDataType: StepDataType
  },
) {
  return useStepRegistry().defineStep({
    displayName,
    def: def as NodeDef,
    type,
    inputDataTypes,
    outputDataType,
    component: {} as unknown as Component,
  })
}

describe('fork handler type testing', async () => {

  makeAppContext(() => {

    const inputDataTypes = [HeightMap, BitMask] as const
    const outputDataType = NormalMap

    type InputInstances = HeightMap | BitMask

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
      type: NodeType.FORK,
      inputDataTypes,
      outputDataType,
    })

    const store = usePipelineStore() as unknown as PipelineStore
    const newStep = store.add(stepDef.def)
    const step = useForkHandler(newStep.id, {
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

      async run({ config, inputData, branchIndex }) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()
        expectTypeOf(branchIndex).toEqualTypeOf<number>()

        if (!config.maskImageData) return

        return {
          preview: config.maskImageData,
          output: new NormalMap(1, 1),
        }
      },
      watcher(step, defaultWatcherTargets) {
        type R = typeof step extends InitializedNode<any, infer R> ? R : never
        type T = typeof step extends InitializedNode<infer U, infer R> ? U : never
        expectTypeOf(step).toExtend<InitializedNode<T, R>>()
        expectTypeOf<R>().toEqualTypeOf<ForkStepRunner<T>>()
        expectTypeOf(step.config).toEqualTypeOf<InitializedNode<T, R>['config']>()

        expectTypeOf(defaultWatcherTargets).toExtend<WatcherTarget[]>()

        return [
          ...defaultWatcherTargets,
        ]
      },

    })

    type RF = typeof step extends InitializedNode<any, infer R> ? R : never
    type TF = typeof step extends InitializedNode<infer U, infer R> ? U : never
    expectTypeOf(step).toExtend<InitializedNode<TF, RF>>()
    expectTypeOf<RF>().toEqualTypeOf<ForkStepRunner<TF>>()
    type NodeRunner = typeof step extends InitializedNode<infer T, infer R> ? R : never
    expectTypeOf<NodeRunner>().toEqualTypeOf<ForkStepRunner<TF>>()

    type T = typeof step extends InitializedNode<infer U> ? U : never

    // type NodeRunner =
    //   typeof step extends InitializedNode<infer T, infer R> ? R : never

    it('creates correct step', () => {

      expectTypeOf<T>().toExtend<StepContext<C, SC, RC, I, O>>()
      expectTypeOf(step).not.toEqualTypeOf<InitializedNode<AnyStepContext>>()
      expectTypeOf(step).toExtend<InitializedNode<StepContext<C, SC, RC, I, O>>>()

      expectTypeOf(step).toEqualTypeOf<InitializedForkNode<T, ForkStepRunner<T>>>()
      expectTypeOf(step.outputPreview).toEqualTypeOf<ImageData | ImageData[] | null>()
      expectTypeOf(step.outputData).toExtend<SingleRunnerOutput<T>[]>()
    })

    it('creates correct handler', () => {
      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toEqualTypeOf<
        IStepHandler<T, ForkStepRunner<T>>['run']
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<
        ForkStepRunner<T>
      >()
      expectTypeOf(step.handler.run).toExtend<
        (options: {
          config: T['RC'],
          inputData: T['Input'] | null,
          branchIndex: number
        }) => Promise<
          SingleRunnerOutput<T>
        >
      >()
      expectTypeOf(step.handler.run).parameters.toExtend<[
        {
          config: RC,
          inputData: InputInstances | null,
          branchIndex: number
        }
      ]>()
      expectTypeOf(step.handler.run).returns.toEqualTypeOf<
        Promise<SingleRunnerOutput<T>>
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
        IStepHandler<T, ForkStepRunner<T>>['watcher']
      >()
      expectTypeOf(step.handler.watcher).toEqualTypeOf<
        (step: InitializedNode<T, ForkStepRunner<T>>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]
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

      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        IStepHandler<T>['validateInput']
      >()
      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        ((inputData: T['Input'], inputDataTypes: T['InputConstructors']) => StepValidationError[])
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
    ForkStepRunner<T>
  >

  it('preserves the generic parameters', () => {
    expectTypeOf<Infer>().toExtend<
      StepHandlerOptions<T, ForkStepRunner<T>>
    >()

    expectTypeOf<Infer['config']>().returns.toEqualTypeOf<RawConfig>()
    expectTypeOf<Infer['reactiveConfig']>().returns.toEqualTypeOf<RC>()
    expectTypeOf<Infer['run']>().toEqualTypeOf<ForkStepRunner<T>>

    expectTypeOf<Infer['run']>().parameters.toEqualTypeOf<[{
      config: RC
      inputData: StepInputTypesToInstances<[A, B]> | null,
      branchIndex: number,
    }]>()

    expectTypeOf<Infer['run']>().parameters.toEqualTypeOf<[{
      config: T['RC']
      inputData: StepInputTypesToInstances<T['InputConstructors']> | null,
      branchIndex: number,
    }]>()

  })

})
