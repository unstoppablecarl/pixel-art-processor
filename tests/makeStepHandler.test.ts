import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import type { StepValidationError } from '../src/lib/errors.ts'
import {
  type AnyStepContext,
  type ReactiveConfigType,
  type StepContext,
  type StepInputTypesToInstances,
} from '../src/lib/pipeline/Step.ts'
import {
  type IStepHandler,
  makeStepHandler,
  type StepHandlerOptional,
  type StepHandlerOptions,
} from '../src/lib/pipeline/StepHandler.ts'
import type { StepRegistry } from '../src/lib/pipeline/StepRegistry.ts'
import type { NormalStepRunner, NormalStepRunnerOutput } from '../src/lib/pipeline/StepRunner.ts'
import { BitMask } from '../src/lib/step-data-types/BitMask.ts'
import { HeightMap } from '../src/lib/step-data-types/HeightMap.ts'
import { NormalMap } from '../src/lib/step-data-types/NormalMap.ts'
import type { MaybePromise } from '../src/lib/util/misc.ts'

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

// Helper def string
const DEF = 'test/handler'

describe('StepHandlerOptional', () => {
  it('lists the optional keys of IStepHandler', () => {
    type OptionalKeys = StepHandlerOptional

    // This is a structural sanity check: if you change optional keys,
    // this will break and force you to update tests intentionally.
    type Expected =
      | 'watcher'
      | 'serializeConfig'
      | 'deserializeConfig'
      | 'reactiveConfig'
      | 'config'
      | 'loadConfig'
      | 'validateInputTypeStatic'

    expectTypeOf<OptionalKeys>().toEqualTypeOf<Expected>()
  })
})

describe('StepHandlerOptions<T>', () => {
  it('requires non-optional IStepHandler fields and run, while making StepHandlerOptional keys optional', () => {
    // Minimal valid options: only required fields + run()
    const minimalOptions: StepHandlerOptions<T, NormalStepRunner<T>> = {
      inputDataTypes: [A, B] as const,
      outputDataType: COut,
      run(args) {
        expectTypeOf(args.config).toEqualTypeOf<RC>()
        expectTypeOf(args.inputData).toEqualTypeOf<
          StepInputTypesToInstances<[typeof A, typeof B]> | null
        >()

        return {
          output: {} as InstanceType<typeof COut>,
        }
      },
    }

    // `config` is optional
    expectTypeOf(minimalOptions.config).toEqualTypeOf<(() => RawConfig) | undefined>()

    // Now a "maximal" options object using all optional fields
    const fullOptions: StepHandlerOptions<T, NormalStepRunner<T>> = {
      inputDataTypes: [A, B] as readonly [typeof A, typeof B],
      outputDataType: COut,

      config() {
        return {} as RC
      },

      run(args) {
        return {
          output: {} as InstanceType<typeof COut>,
        }
      },

      watcher(step, defaults) {
        expectTypeOf(step.config).toEqualTypeOf<RC>()
        return defaults
      },

      validateInputTypeStatic(input, allowed): StepValidationError[] {
        expectTypeOf(input).toEqualTypeOf<A | B>()
        expectTypeOf(allowed).toEqualTypeOf<readonly [typeof A, typeof B]>()

        return []
      },

      serializeConfig(config): SerializedConfig {
        expectTypeOf(config).toEqualTypeOf<RawConfig>()

        return {} as SerializedConfig
      },

      deserializeConfig(serializedConfig) {
        expectTypeOf(serializedConfig).toEqualTypeOf<SerializedConfig>()

        return {} as RawConfig
      },

      loadConfig(config, serializedConfig) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(serializedConfig).toEqualTypeOf<SerializedConfig>()
        // no-op
      },
    }

    expectTypeOf(fullOptions.inputDataTypes)
      .toEqualTypeOf<readonly [typeof A, typeof B]>()

    expectTypeOf(fullOptions.outputDataType)
      .toEqualTypeOf<typeof COut>()

    expectTypeOf(fullOptions.config)
      .toEqualTypeOf<(() => RawConfig) | undefined>()

    expectTypeOf(fullOptions.run)
      .toEqualTypeOf<NormalStepRunner<T>>()

  })

  it('does not allow omitting required core properties', () => {
    // Omitting inputDataTypes should fail
    // @ts-expect-error missing required inputDataTypes
    const bad1: StepHandlerOptions<T> = {
      outputDataType: COut,
      run() {
        return { output: {} as InstanceType<typeof COut> }
      },
    }

    // Omitting outputDataType should fail
    // @ts-expect-error missing required outputDataType
    const bad2: StepHandlerOptions<T> = {
      inputDataTypes: [A, B] as const,
      run() {
        return { output: {} as InstanceType<typeof COut> }
      },
    }

    // Omitting run should fail
    // @ts-expect-error missing required run
    const bad3: StepHandlerOptions<T> = {
      inputDataTypes: [A, B] as const,
      outputDataType: COut,
    }

    const noop = (v: any) => v
    noop(bad1)
    noop(bad2)
    noop(bad3)
  })
})

const fakeStepRegistry = {
  validateDefRegistration: () => {
  },
} as unknown as StepRegistry

describe('makeStepHandler<T>', () => {
  it('returns an IStepHandler<T>-compatible object merging defaults and options', () => {
    const options: StepHandlerOptions<T, NormalStepRunner<T>> = {
      inputDataTypes: [A, B] as const,
      outputDataType: COut,

      config() {
        return {} as RC
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

      serializeConfig(config) {
        return {} as SerializedConfig
      },

      deserializeConfig(serializedConfig) {
        return {} as RawConfig
      },
    }

    const handler = makeStepHandler<T, NormalStepRunner<T>>(DEF, options, fakeStepRegistry)

    // Shape of handler: must be a full IStepHandler<T>
    expectTypeOf(handler).toEqualTypeOf<IStepHandler<T, NormalStepRunner<T>>>()

    // validate core fields
    expectTypeOf(handler.inputDataTypes).toEqualTypeOf<readonly [typeof A, typeof B]>()
    expectTypeOf(handler.outputDataType).toEqualTypeOf<typeof COut>()

    // defaulted config() is overridden by options.config()
    expectTypeOf(handler.config).toEqualTypeOf<() => RawConfig>()

    // run has the correct StepRunner signature
    expectTypeOf(handler.run).toEqualTypeOf<NormalStepRunner<T>>()

    // ensure defaulted methods have the right types even if not provided in options
    expectTypeOf(handler.watcher).toEqualTypeOf<
      IStepHandler<T, NormalStepRunner<T>>['watcher']
    >()
    expectTypeOf(handler.serializeConfig).toEqualTypeOf<
      IStepHandler<T>['serializeConfig']
    >()
    expectTypeOf(handler.deserializeConfig).toEqualTypeOf<
      IStepHandler<T>['deserializeConfig']
    >()
    expectTypeOf(handler.loadConfig).toEqualTypeOf<
      IStepHandler<T>['loadConfig']
    >()
    expectTypeOf(handler.validateInputTypeStatic).toEqualTypeOf<
      IStepHandler<T>['validateInputTypeStatic']
    >()
  })

  it('infers T and Runner from StepHandlerOptions when used with AnyStepContext', () => {
    type AnyT = AnyStepContext

    const options = {
      inputDataTypes: [A, B] as const,
      outputDataType: COut,
      config() {
        return {} as ReactiveConfigType<RawConfig>
      },
      run(args: { config: ReactiveConfigType<RawConfig> }) {
        return {
          output: {} as COut,
        }
      },
    }

    // This checks that makeStepHandler doesn’t destroy inference when used with a
    // generic AnyStepContext T, and that the result still conforms to IStepHandler.
    const handler = makeStepHandler<AnyT>(DEF, options as any, fakeStepRegistry)

    expectTypeOf(handler).toExtend<IStepHandler<AnyT>>()
  })

  it('produces a run return type by default', () => {
    const options: StepHandlerOptions<T, NormalStepRunner<T>> = {
      inputDataTypes: [A, B] as const,
      outputDataType: COut,
      run(args) {
        return {
          output: {} as InstanceType<typeof COut>,
        }
      },
    }

    const handler = makeStepHandler<T, NormalStepRunner<T>>(DEF, options, fakeStepRegistry)

    expectTypeOf(handler.run).toEqualTypeOf<
      NormalStepRunner<T>
    >()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      MaybePromise<
        NormalStepRunnerOutput<T['Output']>
      >
    >()
  })
})
