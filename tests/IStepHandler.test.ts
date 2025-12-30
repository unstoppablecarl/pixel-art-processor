import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import { shallowReactive } from 'vue'
import type { ReactiveConfigType, StepContext, StepInputTypesToInstances } from '../src/lib/pipeline/Step.ts'
import type { IStepHandler, StepHandlerOptions } from '../src/lib/pipeline/StepHandler.ts'
import type { NormalStepRunner, NormalStepRunnerOutput } from '../src/lib/pipeline/StepRunner.ts'
import { BitMask } from '../src/lib/step-data-types/BitMask.ts'
import { HeightMap } from '../src/lib/step-data-types/HeightMap.ts'
import { NormalMap } from '../src/lib/step-data-types/NormalMap.ts'

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

type T = StepContext<
  RawConfig,
  SerializedConfig,
  RC,
  readonly [typeof A, typeof B],
  typeof COut
>

describe('IStepHandler<T> basic structure', () => {
  const handler: IStepHandler<T, NormalStepRunner<T>> = {
    inputDataTypes: [A, B] as const,
    outputDataType: COut,

    config() {
      return {} as RC
    },
    reactiveConfig(defaults: RawConfig): RC {
      return shallowReactive({
        ...defaults,
      })
    },

    run(args) {
      expectTypeOf(args.config).toEqualTypeOf<RC>()
      expectTypeOf(args.inputData).toEqualTypeOf<
        StepInputTypesToInstances<[typeof A, typeof B]> | null
      >()

      return {
        output: {} as InstanceType<typeof COut>,
      }
    },

    watcher(step, defaults) {
      expectTypeOf(step.config).toEqualTypeOf<RC>()
      return defaults
    },

    validateInput(inputData, allowed) {
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
  }

  it('has correct inputDataTypes', () => {
    expectTypeOf(handler.inputDataTypes).toEqualTypeOf<readonly [typeof A, typeof B]>()
  })

  it('has correct outputDataType', () => {
    expectTypeOf(handler.outputDataType).toEqualTypeOf<typeof COut>()
  })

  it('has correct config() return type', () => {
    expectTypeOf(handler.config()).toEqualTypeOf<RawConfig>()
  })

  it('has correct config() return type', () => {
    expectTypeOf(handler.reactiveConfig({
      foo: 1,
      bar: 'a'
    })).toEqualTypeOf<RC>()
  })

  it('has correct run() signature', () => {
    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC
      inputData: StepInputTypesToInstances<[typeof A, typeof B]> | null
    }]>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      NormalStepRunnerOutput<T['Output']> | null | undefined | Promise<NormalStepRunnerOutput<T['Output']>>
    >()
  })
})

describe('StepHandlerOptions<T>', () => {
  const opts: StepHandlerOptions<T, NormalStepRunner<T>> = {
    inputDataTypes: [A, B] as const,
    outputDataType: COut,
    config() {
      return {} as RC
    },
    run(args) {
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
    RawConfig,
    SerializedConfig,
    RC,
    readonly [typeof A],
    typeof COut
  >

  const handler2 = {
    inputDataTypes: [A] as const,
    outputDataType: COut,
    config() {
      return {} as RC
    },
    run() {
      return { output: {} as InstanceType<typeof COut> }
    },
  }

  it('allows narrowing inputDataTypes', () => {
    expectTypeOf(handler2.inputDataTypes).toEqualTypeOf<readonly [typeof A]>()
    expectTypeOf(handler2).toExtend<Pick<IStepHandler<T2>, 'inputDataTypes' | 'outputDataType' | 'config' | 'run'>>()
    expectTypeOf(handler2.run).returns.toExtend<{ output: InstanceType<typeof COut> }>()
  })

  it('does not allow widening inputDataTypes', () => {
    const bad: Pick<IStepHandler<T2>, 'inputDataTypes' | 'outputDataType' | 'config' | 'run'> = {
      // @ts-expect-error inputDataTypes is too wide
      inputDataTypes: [A, B] as const,
      outputDataType: COut,
      config() {
        return {} as RC
      },
      run() {
        return { output: {} as InstanceType<typeof COut> }
      },
    }
    const noop = (v: any) => v
    noop(bad)
  })
})