import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { type Component, shallowReactive } from 'vue'
import {
  type AnyStepDefinition,
  type AnyStepMeta,
  defineStepMeta,
  type IRunnerResultMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type WatcherTarget,
} from '../src/lib/pipeline/_types.ts'
import { StepValidationError } from '../src/lib/pipeline/errors/StepValidationError.ts'
import { type InitializedForkNode, type InitializedNode } from '../src/lib/pipeline/Node.ts'
import type { ForkRunner, SingleRunnerOutput } from '../src/lib/pipeline/NodeRunner.ts'
import {
  type AnyStepContext,
  type ReactiveConfigType,
  type StepContext,
  type StepInputTypesToInstances,
} from '../src/lib/pipeline/Step'
import type { IStepHandler } from '../src/lib/pipeline/StepHandler'
import { installStepRegistry, makeStepRegistry, useStepRegistry } from '../src/lib/pipeline/StepRegistry.ts'
import { useForkHandler } from '../src/lib/pipeline/useStepHandler.ts'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import { createPersistedState } from '../src/lib/store/_pinia-persist-plugin'
import { usePipelineStore } from '../src/lib/store/pipeline-store.ts'
import { deserializeImageData, type SerializedImageData, serializeImageData } from '../src/lib/util/ImageData.ts'

function makeAppContext(cb: () => void) {
  installStepRegistry(makeStepRegistry())

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

describe('fork handler type testing', async () => {

  makeAppContext(async () => {

    type InputInstances = StepInputTypesToInstances<
      readonly [typeof HeightMap, typeof BitMask]
    >

    const configRaw = {
      maskImageData: null as null | ImageData,
    }

    type C = typeof configRaw
    type SC = {
      maskImageData: SerializedImageData | null,
    }
    type RC = ReactiveConfigType<C>

    const STEP_META = defineStepMeta({
      displayName: 'test',
      def: 'testing',
      type: NodeType.FORK,
      inputDataTypes: [HeightMap, BitMask],
      outputDataType: NormalMap,
      branchDefs: [],
    })

    useStepRegistry().validateDefRegistration(STEP_META)

    useStepRegistry().defineStep({
      ...STEP_META,
      component: {} as unknown as Component,
    } as unknown as AnyStepDefinition)

    type M = typeof STEP_META

    const store = usePipelineStore()
    const newStep = store.add(STEP_META.def as NodeDef, null)
    const step = useForkHandler(newStep.id, STEP_META, {
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
        expect(config).not.toEqual(undefined)

        return {
          ...config,
          maskImageData: deserializeImageData(config.maskImageData),
        }
      },

      async run({ config, inputData, inputPreview, branchIndex }) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()
        expectTypeOf(inputPreview).toEqualTypeOf<ImageData | null>()
        expectTypeOf(branchIndex).toEqualTypeOf<number>()

        if (!config.maskImageData) return

        return {
          preview: config.maskImageData,
          output: new NormalMap(1, 1),
        }
      },
      watcherTargets(n, defaults) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<M, T>>()
        expectTypeOf(defaults).toEqualTypeOf<WatcherTarget[]>()

        return []
      },
      onRemoving(n) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<M, T>>()
      },
      onRemoved(id) {
        expectTypeOf(id).toEqualTypeOf<NodeId>()
      },
      onAdded(n) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<M, T>>()
      },
    })

    await Promise.resolve()

    type TFromNode = typeof step extends InitializedNode<any, infer T> ? T : never
    type RFromNode = typeof step['handler'] extends IStepHandler<any, any, infer R> ? R : never
    expectTypeOf(step).toExtend<InitializedNode<M, TFromNode>>()
    expectTypeOf<RFromNode>().toExtend<ForkRunner<TFromNode>>()
    expectTypeOf<RFromNode>()
      .parameter(0)
      .toEqualTypeOf<{
        config: TFromNode['RC'],
        inputData: TFromNode['Input'] | null,
        inputPreview: ImageData | null,
        meta: IRunnerResultMeta,
        branchIndex: number
      }>()

    expectTypeOf<RFromNode>()
      .returns
      .toEqualTypeOf<Promise<SingleRunnerOutput<TFromNode>>>()

    type T = typeof step extends InitializedNode<any, infer U> ? U : never

    it('T is a StepContext for M, C, SC, RC', () => {
      expectTypeOf<T>().toEqualTypeOf<StepContext<M, C, SC, RC>>()
    })
    // type NodeRunner =
    //   typeof step extends InitializedNode<infer T, infer R> ? R : never

    it('creates correct step', () => {

      expectTypeOf<T>().toExtend<StepContext<M, C, SC, RC>>()
      expectTypeOf(step).not.toEqualTypeOf<InitializedNode<AnyStepMeta, AnyStepContext>>()
      expectTypeOf(step).toExtend<InitializedNode<M, StepContext<M, C, SC, RC>>>()

      expectTypeOf(step).toEqualTypeOf<InitializedForkNode<M, T>>()

    })

    it('creates correct handler', () => {
      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toEqualTypeOf<
        IStepHandler<M, T, ForkRunner<T>>['run']
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<
        ForkRunner<T>
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<{
        __fork?: never,
        (options: {
          config: RC,
          inputData: InputInstances | null,
          inputPreview: ImageData | null,
          branchIndex: number,
          meta: IRunnerResultMeta,
        }): Promise<
          SingleRunnerOutput<T>
        >
      }>()
      expectTypeOf(step.handler.run).parameters.toEqualTypeOf<[{
        config: RC,
        inputData: InputInstances | null,
        inputPreview: ImageData | null,
        branchIndex: number,
        meta: IRunnerResultMeta
      }]>()
      expectTypeOf(step.handler.run).returns.toEqualTypeOf<
        Promise<SingleRunnerOutput<T>>
      >()

      expectTypeOf(step.handler.config).toEqualTypeOf<
        IStepHandler<M, T>['config']
      >()
      expectTypeOf(step.handler.config).toEqualTypeOf<
        () => C
      >()

      expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
        IStepHandler<M, T>['reactiveConfig']
      >()
      expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
        (defaults: C) => RC
      >()

      expectTypeOf(step.handler.watcherTargets).toEqualTypeOf<
        IStepHandler<M, T, ForkRunner<T>>['watcherTargets']
      >()

      expectTypeOf(step.handler.watcherTargets).toEqualTypeOf<
        (node: InitializedNode<M, T>, defaults: WatcherTarget[]) => WatcherTarget[]
      >()

      expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
        IStepHandler<M, T>['serializeConfig']
      >()
      expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
        ((config: C) => SC)
      >()

      expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
        IStepHandler<M, T>['deserializeConfig']
      >()
      expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
        ((config: SC) => C)
      >()

      expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
        IStepHandler<M, T>['loadConfig']
      >()
      expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
        (config: RC, serializedConfig: SC) => void
      >()

      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        IStepHandler<M, T>['validateInput']
      >()
      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        ((inputData: T['Input'], inputDataTypes: T['InputConstructors']) => StepValidationError[])
      >()

      expectTypeOf(step.handler.meta.inputDataTypes).toEqualTypeOf<M['inputDataTypes']>()
      expectTypeOf(step.handler.meta.outputDataType).toEqualTypeOf<M['outputDataType']>()
    })
  })
})