import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { type ShallowReactive, shallowReactive } from 'vue'
import { type IRunnerResultMeta, type WatcherTarget } from '../src/lib/pipeline/_types.ts'
import { StepValidationError } from '../src/lib/pipeline/errors/StepValidationError.ts'
import { type InitializedNode, type InitializedStepNode } from '../src/lib/pipeline/Node.ts'
import type { NormalStepRunner, SingleRunnerOutput } from '../src/lib/pipeline/NodeRunner.ts'
import { type AnyStepContext, type StepContext, type StepInputTypesToInstances } from '../src/lib/pipeline/Step'
import type {
  INodeHandler,
  IStepHandler,
  StepHandlerOptions,
  StepHandlerOptionsInfer,
} from '../src/lib/pipeline/StepHandler'
import { installStepRegistry, makeStepRegistry } from '../src/lib/pipeline/StepRegistry.ts'
import { useStepHandler } from '../src/lib/pipeline/useStepHandler'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import { createPersistedState } from '../src/lib/store/_pinia-persist-plugin'
import { usePipelineStore } from '../src/lib/store/pipeline-store.ts'
import { deserializeImageData, type SerializedImageData, serializeImageData } from '../src/lib/util/ImageData.ts'
import { defineTestStep } from './_helpers.ts'

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

    const stepDef = defineTestStep({
      def: 'test step',
      inputDataTypes,
      outputDataType,
    })

    const store = usePipelineStore()
    const newStep = store.add(stepDef.def, null)
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
        expect(config).not.toEqual(undefined)

        return {
          ...config,
          maskImageData: deserializeImageData(config.maskImageData),
        }
      },

      async run({ config, inputData }) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()

        if (!config.maskImageData) return

        return {
          preview: config.maskImageData,
          output: new NormalMap(1, 1),
        }
      },
      watcherTargets(n, defaults) {
        expectTypeOf(n).toEqualTypeOf<InitializedStepNode<T>>()
        expectTypeOf(defaults).toEqualTypeOf<WatcherTarget[]>()

        return []
      },
    })

    await Promise.resolve()

    type TFromNode = typeof step extends InitializedNode<infer T> ? T : never
    type HandlerFromNode = typeof step['handler']
    type RFromNode = HandlerFromNode extends INodeHandler<any, infer R, any> ? R : never
    expectTypeOf(step).toExtend<InitializedNode<TFromNode>>()
    expectTypeOf<RFromNode>().toEqualTypeOf<NormalStepRunner<TFromNode>>()
    expectTypeOf<RFromNode>()
      .parameter(0)
      .toEqualTypeOf<{
        config: TFromNode['RC']
        inputData: TFromNode['Input'] | null
        meta: IRunnerResultMeta,
      }>()

    expectTypeOf<RFromNode>()
      .returns
      .toEqualTypeOf<Promise<SingleRunnerOutput<TFromNode>>>()

    type T = typeof step extends InitializedNode<infer U> ? U : never

    // type NodeRunner =
    //   typeof step extends InitializedNode<infer T, infer R> ? R : never

    it('creates correct step', () => {

      expectTypeOf<T>().toExtend<StepContext<C, SC, RC, I, O>>()
      expectTypeOf(step).not.toEqualTypeOf<InitializedNode<AnyStepContext>>()
      expectTypeOf(step).toExtend<InitializedNode<StepContext<C, SC, RC, I, O>>>()

      expectTypeOf(step).toEqualTypeOf<InitializedStepNode<T>>()
      expectTypeOf(step.outputPreview).toEqualTypeOf<ImageData | null>()
      expectTypeOf(step.outputData).toEqualTypeOf<OutputInstance | null>()
      expectTypeOf(step.outputMeta).toEqualTypeOf<IRunnerResultMeta>()
    })

    it('creates correct handler', () => {
      expect(step.handler).to.not.eq(undefined)

      expectTypeOf(step.handler.run).toEqualTypeOf<
        IStepHandler<T>['run']
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<
        NormalStepRunner<T>
      >()
      expectTypeOf(step.handler.run).toEqualTypeOf<{
        ({ config, inputData }: {
          config: RC,
          inputData: InputInstances | null,
          meta: IRunnerResultMeta,
        }): Promise<SingleRunnerOutput<T>>
      }>()

      expectTypeOf(step.handler.run).parameters.toEqualTypeOf<[
        { config: RC, inputData: InputInstances | null, meta: IRunnerResultMeta }
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

      expectTypeOf(step.handler.watcherTargets).toEqualTypeOf<
        IStepHandler<T>['watcherTargets']
      >()

      expectTypeOf(step.handler.watcherTargets).toEqualTypeOf<
        (node: InitializedStepNode<T>, defaults: WatcherTarget[]) => WatcherTarget[]
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
    C
  >

  it('preserves the generic parameters', () => {
    expectTypeOf<Infer>().toExtend<
      StepHandlerOptions<T>
    >()

    expectTypeOf<Infer['config']>().returns.toEqualTypeOf<RawConfig>()
    expectTypeOf<Infer['reactiveConfig']>().returns.toEqualTypeOf<RC>()
    expectTypeOf<Infer['run']>().toEqualTypeOf<NormalStepRunner<T>>

    expectTypeOf<Infer['run']>().parameters.toEqualTypeOf<[{
      config: RC
      inputData: StepInputTypesToInstances<[A, B]> | null,
      meta: IRunnerResultMeta,
    }]>()

    expectTypeOf<Infer['run']>().parameters.toEqualTypeOf<[{
      config: T['RC']
      inputData: StepInputTypesToInstances<T['InputConstructors']> | null,
      meta: IRunnerResultMeta,
    }]>()

  })

})
