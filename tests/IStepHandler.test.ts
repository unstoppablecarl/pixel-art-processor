import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import { shallowReactive } from 'vue'
import { type AnyStepMeta, defineStepMeta, type IRunnerResultMeta, NodeType } from '../src/lib/pipeline/_types.ts'
import type { NormalRunner, SingleRunnerOutput } from '../src/lib/pipeline/NodeRunner.ts'
import type { ReactiveConfigType, StepContext } from '../src/lib/pipeline/Step.ts'
import type { IStepHandler, StepHandlerOptions } from '../src/lib/pipeline/StepHandler.ts'
import { BitMask } from '../src/lib/step-data-types/BitMask.ts'
import { HeightMap } from '../src/lib/step-data-types/HeightMap.ts'
import { NormalMap } from '../src/lib/step-data-types/NormalMap.ts'
import { PassThrough } from '../src/lib/step-data-types/PassThrough.ts'

class A extends BitMask {
}

class B extends NormalMap {
}

class COut extends HeightMap {
}

type RawConfig = {
  foo: number
  bar: string
}

type SerializedConfig = {
  foo: number
  bar: string
}

type RC = ReactiveConfigType<RawConfig>

const STEP_META = defineStepMeta({
  displayName: 'test',
  def: 'testing',
  type: NodeType.STEP,
  inputDataTypes: [A, B],
  outputDataType: COut,
})

type M = typeof STEP_META

type T = StepContext<
  M,
  RawConfig,
  SerializedConfig,
  RC
>

describe('IStepHandler<T> basic structure', () => {
  const STEP_META = defineStepMeta({
    type: NodeType.STEP,
    def: 'testing',
    displayName: 'testing',
    inputDataTypes: [A, B] as const,
    outputDataType: COut,
  })

  const handler: IStepHandler<typeof STEP_META, T, NormalRunner<T>> = {
    meta: STEP_META,

    config() {
      return {} as RC
    },
    reactiveConfig(defaults: RawConfig): RC {
      return shallowReactive({
        ...defaults,
      })
    },

    async run(args) {
      expectTypeOf(args.config).toEqualTypeOf<RC>()
      expectTypeOf(args.inputData).toExtend<A | B | null>()

      return {
        output: {} as InstanceType<typeof COut>,
      }
    },

    watcherTargets() {
      return []
    },

    validateInput(_inputData, _allowed) {
      return []
    },

    serializeConfig(config) {
      expectTypeOf(config).toEqualTypeOf<RawConfig>()
      return config
    },

    deserializeConfig(config) {
      expectTypeOf(config).toEqualTypeOf<SerializedConfig>()
      return config
    },

    loadConfig(config, serialized) {
      expectTypeOf(config).toEqualTypeOf<RC>()
      expectTypeOf(serialized).toEqualTypeOf<SerializedConfig>()
    },
    setPassThroughDataType() {

    },
    clearPassThroughDataType() {

    },
    currentInputDataTypes: [PassThrough],
    currentOutputDataType: PassThrough,
  }

  it('has correct inputDataTypes', () => {
    expectTypeOf(handler.meta.inputDataTypes).toEqualTypeOf<readonly [typeof A, typeof B]>()
  })

  it('has correct outputDataType', () => {
    expectTypeOf(handler.meta.outputDataType).toEqualTypeOf<typeof COut>()
  })

  it('has correct config() return type', () => {
    expectTypeOf(handler.config()).toEqualTypeOf<RawConfig>()
  })

  it('has correct config() return type', () => {
    expectTypeOf(handler.reactiveConfig({
      foo: 1,
      bar: 'a',
    })).toEqualTypeOf<RC>()
  })

  it('has correct process() signature', () => {
    expectTypeOf(handler.run).parameters.toExtend<[{
      config: RC
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta,
    }]>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<T>>
    >()

    expectTypeOf(handler.run).returns.toExtend<
      Promise<SingleRunnerOutput<T>>
    >()
  })
})

describe('StepHandlerOptions<T>', () => {
  const STEP_META: AnyStepMeta = {
    type: NodeType.STEP,
    def: 'testing',
    displayName: 'testing',
    inputDataTypes: [A, B] as const,
    outputDataType: COut,
  }

  const opts: StepHandlerOptions<typeof STEP_META, RawConfig, RC, SerializedConfig, NormalRunner<T>> = {
    config() {
      return {} as RC
    },
    async run(_args) {
      return {
        output: {} as InstanceType<typeof COut>,
      }
    },
  }

  it('is assignable to IStepHandler<T>', () => {
    expectTypeOf(opts.config).toEqualTypeOf<(() => RawConfig) | undefined>

  })
})

describe('IStepHandler variance behavior', () => {
  type T2 = StepContext<
    M,
    RawConfig,
    SerializedConfig,
    RC
  >

  const handler2 = {
    meta: STEP_META,
    config() {
      return {} as RC
    },
    run() {
      return { output: {} as InstanceType<typeof COut> }
    },
  }

  it('allows narrowing inputDataTypes', () => {
    // expectTypeOf(handler2.meta.inputDataTypes).toEqualTypeOf<readonly [typeof A]>()
    expectTypeOf(handler2.meta.inputDataTypes).toExtend<IStepHandler<M, T2>['meta']['inputDataTypes']>()
    expectTypeOf(handler2.meta.outputDataType).toExtend<IStepHandler<M, T2>['meta']['outputDataType']>()
    expectTypeOf(handler2.config).toExtend<IStepHandler<M, T2>['config']>()

  })
})