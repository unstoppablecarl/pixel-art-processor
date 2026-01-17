import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { type Component, type Raw, type ShallowReactive, shallowReactive } from 'vue'
import type { StepInputTypesToInstances } from '../src/lib/node-data-types/_node-data-types.ts'
import { BitMask } from '../src/lib/node-data-types/BitMask'
import { HeightMap } from '../src/lib/node-data-types/HeightMap'
import { NormalMap } from '../src/lib/node-data-types/NormalMap'
import {
  type IRunnerResultMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type WatcherTarget,
} from '../src/lib/pipeline/_types.ts'
import { StepValidationError } from '../src/lib/pipeline/errors/StepValidationError.ts'
import { type InitializedForkNode, type InitializedNode } from '../src/lib/pipeline/Node.ts'
import { defineForkHandler, type ForkHandler, useForkHandler } from '../src/lib/pipeline/NodeHandler/ForkHandler.ts'
import { getNodeRegistry, installNodeRegistry, makeNodeRegistry } from '../src/lib/pipeline/NodeRegistry.ts'
import type { ForkRunner, SingleRunnerOutput } from '../src/lib/pipeline/NodeRunner.ts'
import { type AnyNodeDefinition, defineFork } from '../src/lib/pipeline/types/definitions.ts'
import { createPersistedState } from '../src/lib/store/_pinia-persist-plugin'
import { usePipelineStore } from '../src/lib/store/pipeline-store.ts'
import { deserializeImageData, type SerializedImageData, serializeImageData } from '../src/lib/util/html-dom/ImageData.ts'

function makeAppContext(cb: () => void) {
  installNodeRegistry(makeNodeRegistry())

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
    type OutputInstance = NormalMap

    const configRaw = {
      maskImageData: null as null | ImageData,
    }

    type C = typeof configRaw
    type SC = {
      maskImageData: Raw<SerializedImageData> | null,
    }
    type RC = ShallowReactive<C>

    const STEP_META = defineFork({
      displayName: 'test',
      def: 'testing' as NodeDef,
      type: NodeType.FORK,
      inputDataTypes: [HeightMap, BitMask],
      outputDataType: NormalMap,
      branchDefs: [],
    })

    getNodeRegistry().defineNode({
      ...STEP_META,
      component: {} as unknown as Component,
    } as unknown as AnyNodeDefinition)
    getNodeRegistry().validateDefRegistration(STEP_META)

    type M = typeof STEP_META
    type I = M['inputDataTypes']
    // type O = M['outputDataType']

    type Input = StepInputTypesToInstances<I>
    // type Output = InstanceType<O>

    const store = usePipelineStore()
    const newStep = store.addRaw(STEP_META.def as NodeDef, null)

    const handler = defineForkHandler(STEP_META, {
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
        expectTypeOf(inputData).toEqualTypeOf<HeightMap | BitMask | null>()

        expectTypeOf(inputPreview).toEqualTypeOf<ImageData | null>()
        expectTypeOf(branchIndex).toEqualTypeOf<number>()

        if (!config.maskImageData) return

        return {
          preview: config.maskImageData,
          output: new NormalMap(1, 1),
        }
      },
      watcherTargets(n, defaults) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<C, SC, RC>>()
        // expectTypeOf(n).toEqualTypeOf<InitializedForkNode<C, SC, RC, M>>()

        expectTypeOf(defaults).toEqualTypeOf<WatcherTarget[]>()

        return []
      },
      onRemoving(n) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<C, SC, RC>>()
        // expectTypeOf(n).toEqualTypeOf<InitializedForkNode<C, SC, RC, M>>()
      },
      onRemoved(id) {
        expectTypeOf(id).toEqualTypeOf<NodeId>()
      },
      onAdded(n) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<C, SC, RC>>()
        // expectTypeOf(n).toEqualTypeOf<InitializedForkNode<C, SC, RC, M>>()
      },
    })

    const step = useForkHandler(newStep.id, handler)

    await Promise.resolve()

    it('creates correct step', () => {

      expectTypeOf(step).not.toEqualTypeOf<InitializedNode<C, SC, RC, M>>()
      expectTypeOf(step).toEqualTypeOf<InitializedForkNode<C, SC, RC, M>>()
    })

    it('creates correct handler', () => {
      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toEqualTypeOf<
        ForkHandler<C, SC, RC, M>['run']
      >()
      expectTypeOf(step.handler.run).toExtend<
        ForkRunner<InputInstances, OutputInstance, RC>
      >()

      expectTypeOf(step.handler.run).toEqualTypeOf<{
        __fork?: never,
        (options: {
          config: RC,
          inputData: InputInstances | null,
          inputPreview: ImageData | null,
          branchIndex: number,
          meta: IRunnerResultMeta | null,
        }): Promise<
          SingleRunnerOutput<OutputInstance>
        >
      }>()

      expectTypeOf(step.handler.run).parameters.toEqualTypeOf<[{
        config: RC,
        inputData: InputInstances | null,
        inputPreview: ImageData | null,
        branchIndex: number,
        meta: IRunnerResultMeta | null
      }]>()
      expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
      expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<InputInstances | null>()
      expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
      expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

      expectTypeOf(step.handler.run).returns.toEqualTypeOf<
        Promise<SingleRunnerOutput<OutputInstance>>
      >()

      expectTypeOf(step.handler.config).toEqualTypeOf<
        ForkHandler<C, SC, RC, M>['config']
      >()
      expectTypeOf(step.handler.config).toEqualTypeOf<
        () => C
      >()

      expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
        ForkHandler<C, SC, RC, M>['reactiveConfig']
      >()
      expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
        (defaults: C) => RC
      >()

      expectTypeOf(step.handler.watcherTargets).toEqualTypeOf<
        ForkHandler<C, SC, RC, M>['watcherTargets']
      >()

      expectTypeOf(step.handler.watcherTargets).toEqualTypeOf<
        (node: InitializedNode<C, SC, RC>, defaults: WatcherTarget[]) => WatcherTarget[]
      >()

      expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
        ForkHandler<C, SC, RC, M>['serializeConfig']
      >()
      expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
        ((config: C) => SC)
      >()

      expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
        ForkHandler<C, SC, RC, M>['deserializeConfig']
      >()
      expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
        ((config: SC) => C)
      >()

      expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
        ForkHandler<C, SC, RC, M>['loadConfig']
      >()
      expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
        (config: RC, serializedConfig: SC) => void
      >()

      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        ForkHandler<C, SC, RC, M>['validateInput']
      >()
      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        ((inputData: Input, inputDataTypes: I, meta: IRunnerResultMeta | null) => StepValidationError[])
      >()

      expectTypeOf(step.handler.meta.inputDataTypes).toEqualTypeOf<M['inputDataTypes']>()
      expectTypeOf(step.handler.meta.outputDataType).toEqualTypeOf<M['outputDataType']>()
    })
  })
})