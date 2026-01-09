import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import { defineStepMeta, NodeType } from '../src/lib/pipeline/_types.ts'
import type { StepValidationError } from '../src/lib/pipeline/errors/StepValidationError.ts'
import type { NormalRunner, SingleRunnerOutput } from '../src/lib/pipeline/NodeRunner.ts'

import { type ReactiveConfigType, type StepContext, type StepInputTypesToInstances } from '../src/lib/pipeline/Step.ts'
import {
  type IStepHandler,
  makeStepHandler,
  type StepHandlerOptional,
  type StepHandlerOptions,
} from '../src/lib/pipeline/StepHandler.ts'
import { type StepRegistry } from '../src/lib/pipeline/StepRegistry.ts'
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

// Helper def string
const DEF = 'test/handler'

const STEP_META = defineStepMeta({
  type: NodeType.STEP,
  displayName: 'testing',
  def: DEF,
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

describe('StepHandlerOptional', () => {
  it('lists the optional keys of IStepHandler', () => {
    type OptionalKeys = StepHandlerOptional

    // This is a structural sanity check: if you change optional keys,
    // this will break and force you to update tests intentionally.
    type Expected =
      | 'watcherTargets'
      | 'serializeConfig'
      | 'deserializeConfig'
      | 'reactiveConfig'
      | 'config'
      | 'loadConfig'
      | 'validateInput'

    expectTypeOf<OptionalKeys>().toEqualTypeOf<Expected>()
  })
})

describe('StepHandlerOptions<T>', () => {
  it('requires non-optional IStepHandler fields and process, while making StepHandlerOptional keys optional', () => {
    // Minimal valid options: only required fields + process()
    const minimalOptions: StepHandlerOptions<M, RawConfig, SerializedConfig, RC, NormalRunner<T>> = {
      async run(args) {
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
    const fullOptions: StepHandlerOptions<M, RawConfig, SerializedConfig, RC, NormalRunner<T>> = {
      config() {
        return {} as RC
      },

      async run(args) {
        return {
          output: {} as InstanceType<typeof COut>,
        }
      },

      watcherTargets() {
        return []
      },

      validateInput(input, allowed): StepValidationError[] {
        expectTypeOf(input).toEqualTypeOf<A | B>()
        type AllowedElem = (typeof allowed)[number]
        expectTypeOf<AllowedElem>().toEqualTypeOf<typeof A | typeof B>()

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

    expectTypeOf(fullOptions.config)
      .toEqualTypeOf<(() => RawConfig) | undefined>()

    expectTypeOf(fullOptions.run)
      .toEqualTypeOf<NormalRunner<T>>()

  })

  it('does not allow omitting required core properties', () => {
    // Omitting inputDataTypes should fail
    // @ts-expect-error missing required inputDataTypes
    const bad1: StepHandlerOptions<T> = {
      outputDataType: COut,
      async run() {
        return { output: {} as InstanceType<typeof COut> }
      },
    }

    // Omitting outputDataType should fail
    // @ts-expect-error missing required outputDataType
    const bad2: StepHandlerOptions<T> = {
      inputDataTypes: [A, B] as const,
      async run() {
        return { output: {} as InstanceType<typeof COut> }
      },
    }

    // Omitting process should fail
    // @ts-expect-error missing required process
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
  it('returns an IStepHandler<M, T>-compatible object merging defaults and options', () => {
    const options: StepHandlerOptions<M, RawConfig, SerializedConfig, RC, NormalRunner<T>> = {
      config() {
        return {} as RC
      },

      async run(args) {
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

    const handler = makeStepHandler(STEP_META, options, fakeStepRegistry)

    // Shape of handler: must be a full IStepHandler<T>
    expectTypeOf(handler).toEqualTypeOf<IStepHandler<M, T, NormalRunner<T>>>()

    // validate core fields
    type AllowedElem = (typeof handler.meta.inputDataTypes)[number]
    expectTypeOf<AllowedElem>().toEqualTypeOf<typeof A | typeof B>()

    expectTypeOf(handler.meta.outputDataType).toEqualTypeOf<typeof COut>()

    // defaulted config() is overridden by options.config()
    expectTypeOf(handler.config).toEqualTypeOf<() => RawConfig>()

    // process has the correct NodeRunner signature
    expectTypeOf(handler.run).toEqualTypeOf<NormalRunner<T>>()

    // ensure defaulted methods have the right types even if not provided in options
    expectTypeOf(handler.watcherTargets).toEqualTypeOf<
      IStepHandler<M, T, NormalRunner<T>>['watcherTargets']
    >()
    expectTypeOf(handler.serializeConfig).toEqualTypeOf<
      IStepHandler<M, T>['serializeConfig']
    >()
    expectTypeOf(handler.deserializeConfig).toEqualTypeOf<
      IStepHandler<M, T>['deserializeConfig']
    >()
    expectTypeOf(handler.loadConfig).toEqualTypeOf<
      IStepHandler<M, T>['loadConfig']
    >()
    expectTypeOf(handler.validateInput).toEqualTypeOf<
      IStepHandler<M, T>['validateInput']
    >()
  })

  it('produces a process return type by default', () => {
    const options: StepHandlerOptions<M, RawConfig, SerializedConfig, RC, NormalRunner<T>> = {
      async run(args) {
        return {
          output: {} as InstanceType<typeof COut>,
        }
      },
    }

    const handler = makeStepHandler<M, RawConfig, SerializedConfig, RC, NormalRunner<T>>(STEP_META, options, fakeStepRegistry)

    expectTypeOf(handler.run).toEqualTypeOf<
      NormalRunner<T>
    >()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<
        SingleRunnerOutput<T>
      >
    >()
  })
})
