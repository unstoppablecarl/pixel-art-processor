import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Component, type ShallowReactive, shallowReactive } from 'vue'
import {
  type AnyStepDefinition,
  defineStepMeta,
  type IRunnerResultMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type StepInputTypesToInstances,
  type WatcherTarget,
} from '../src/lib/pipeline/_types.ts'
import { StepValidationError } from '../src/lib/pipeline/errors/StepValidationError.ts'
import { type InitializedNode, type InitializedStepNode } from '../src/lib/pipeline/Node.ts'
import { defineStepHandler, type StepHandler } from '../src/lib/pipeline/NodeHandler/StepHandler.ts'
import { useStepHandler } from '../src/lib/pipeline/NodeHandler/useHandlers.ts'
import type { NormalRunner, SingleRunnerOutput } from '../src/lib/pipeline/NodeRunner.ts'
import { installStepRegistry, makeStepRegistry, useStepRegistry } from '../src/lib/pipeline/StepRegistry.ts'
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

describe('step handler type testing', async () => {

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
      maskImageData: SerializedImageData | null,
    }
    type RC = ShallowReactive<C>

    const STEP_META = defineStepMeta({
      displayName: 'test',
      def: 'testing',
      type: NodeType.STEP,
      inputDataTypes: [HeightMap, BitMask],
      outputDataType: NormalMap,
    })

    useStepRegistry().defineStep({ ...STEP_META, component: {} as unknown as Component } as AnyStepDefinition)
    useStepRegistry().validateDefRegistration(STEP_META)

    type M = typeof STEP_META
    type I = M['inputDataTypes']
    type O = M['outputDataType']

    type Input = StepInputTypesToInstances<I>
    // type Output = InstanceType<O>

    const store = usePipelineStore()
    const newStep = store.add(STEP_META.def as NodeDef, null)

    const handler = defineStepHandler(STEP_META, {
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

      async run({ config, inputData, inputPreview }) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()
        expectTypeOf(inputPreview).toEqualTypeOf<ImageData | null>()

        if (!config.maskImageData) return

        return {
          preview: config.maskImageData,
          output: new NormalMap(1, 1),
        }
      },
      watcherTargets(n, defaults) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<C, SC, RC, I, O, M>>()
        expectTypeOf(defaults).toEqualTypeOf<WatcherTarget[]>()

        return []
      },
      onRemoving(n) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<C, SC, RC, I, O, M>>()
      },
      onRemoved(id) {
        expectTypeOf(id).toEqualTypeOf<NodeId>()
      },
      onAdded(n) {
        expectTypeOf(n).toEqualTypeOf<InitializedNode<C, SC, RC, I, O, M>>()
      },
    })

    const step = useStepHandler(newStep.id, STEP_META, handler)

    await Promise.resolve()

    it('creates correct step', () => {

      expectTypeOf(step).not.toEqualTypeOf<InitializedNode<C, SC, RC, I, O, M>>()
      expectTypeOf(step).toEqualTypeOf<InitializedStepNode<C, SC, RC, I, O, M>>()

      expectTypeOf(step.outputPreview).toEqualTypeOf<ImageData | null>()
      expectTypeOf(step.outputData).toEqualTypeOf<OutputInstance | null>()
      expectTypeOf(step.outputMeta).toEqualTypeOf<IRunnerResultMeta | null>()
    })

    it('creates correct handler', () => {
      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toEqualTypeOf<
        StepHandler<C, SC, RC, I, O>['run']
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<
        NormalRunner<InputInstances, OutputInstance, RC>
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<{
        __normal?: never,
        (options: {
          config: RC,
          inputData: InputInstances | null,
          inputPreview: ImageData | null,
          meta: IRunnerResultMeta | null,
        }): Promise<
          SingleRunnerOutput<OutputInstance>
        >
      }>()

      expectTypeOf(step.handler.run).parameters.toEqualTypeOf<[{
        config: RC,
        inputData: InputInstances | null,
        inputPreview: ImageData | null,
        meta: IRunnerResultMeta | null
      }]>()
      expectTypeOf(step.handler.run).returns.toEqualTypeOf<
        Promise<SingleRunnerOutput<OutputInstance>>
      >()

      expectTypeOf(step.handler.config).toEqualTypeOf<
        StepHandler<C, SC, RC, I, O>['config']
      >()
      expectTypeOf(step.handler.config).toEqualTypeOf<
        () => C
      >()

      expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
        StepHandler<C, SC, RC, I, O>['reactiveConfig']
      >()
      expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
        (defaults: C) => RC
      >()

      expectTypeOf(step.handler.watcherTargets).toEqualTypeOf<
        StepHandler<C, SC, RC, I, O>['watcherTargets']
      >()

      expectTypeOf(step.handler.watcherTargets).toEqualTypeOf<
        (node: InitializedNode<C, SC, RC, I, O, M>, defaults: WatcherTarget[]) => WatcherTarget[]
      >()

      expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
        StepHandler<C, SC, RC, I, O>['serializeConfig']
      >()
      expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
        ((config: C) => SC)
      >()

      expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
        StepHandler<C, SC, RC, I, O>['deserializeConfig']
      >()
      expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
        ((config: SC) => C)
      >()

      expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
        StepHandler<C, SC, RC, I, O>['loadConfig']
      >()
      expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
        (config: RC, serializedConfig: SC) => void
      >()

      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        StepHandler<C, SC, RC, I, O>['validateInput']
      >()
      expectTypeOf(step.handler.validateInput).toEqualTypeOf<
        ((inputData: Input, inputDataTypes: I) => StepValidationError[])
      >()

      expectTypeOf(step.handler.meta.inputDataTypes).toEqualTypeOf<M['inputDataTypes'] | undefined>()
      expectTypeOf(step.handler.meta.outputDataType).toEqualTypeOf<M['outputDataType'] | undefined>()
    })
  })
})