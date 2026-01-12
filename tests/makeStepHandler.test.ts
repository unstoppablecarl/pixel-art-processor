import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import type { Reactive } from 'vue'
import { defineStepMeta, NodeType, type StepInputTypesToInstances } from '../src/lib/pipeline/_types.ts'
import type { StepValidationError } from '../src/lib/pipeline/errors/StepValidationError.ts'
import {
  makeStepHandler,
  type StepHandler,
  type StepHandlerOptions,
} from '../src/lib/pipeline/NodeHandler/StepHandler.ts'
import type { NormalRunner } from '../src/lib/pipeline/NodeRunner.ts'

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

type RC = Reactive<RawConfig>

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

type Input = StepInputTypesToInstances<M['inputDataTypes']>
type Output = InstanceType<M['outputDataType']>

describe('StepHandlerOptions<T>', () => {
  it('requires non-optional StepHandler fields and process, while making StepHandlerOptional keys optional', () => {
    // Minimal valid options: only required fields + process()
    const minimalOptions: StepHandlerOptions<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']> = {
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
    const fullOptions: StepHandlerOptions<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']> = {
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
      .toEqualTypeOf<NormalRunner<Input, Output, RC> | undefined>()

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

describe('makeStepHandler<T>', () => {
  it('returns an StepHandler<M, T>-compatible object merging defaults and options', () => {
    const options: StepHandlerOptions<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']> = {
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

    const handler = makeStepHandler(STEP_META, options)

    // Shape of handler: must be a full StepHandler<T>
    expectTypeOf(handler).toEqualTypeOf<StepHandler<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']>>()

    // validate core fields
    // type AllowedElem = (typeof handler.meta.inputDataTypes)[number]
    expectTypeOf(handler.meta.inputDataTypes).toEqualTypeOf<(typeof A | typeof B)[] | undefined>()

    expectTypeOf(handler.meta.outputDataType).toEqualTypeOf<typeof COut | undefined>()

    // defaulted config() is overridden by options.config()
    expectTypeOf(handler.config).toEqualTypeOf<() => RawConfig>()

    // process has the correct NodeRunner signature
    expectTypeOf(handler.run).toEqualTypeOf<NormalRunner<Input, Output, RC>>()

    // ensure defaulted methods have the right types even if not provided in options
    expectTypeOf(handler.watcherTargets).toEqualTypeOf<
      StepHandler<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']>['watcherTargets']
    >()
    expectTypeOf(handler.serializeConfig).toEqualTypeOf<
      StepHandler<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']>['serializeConfig']
    >()
    expectTypeOf(handler.deserializeConfig).toEqualTypeOf<
      StepHandler<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']>['deserializeConfig']
    >()
    expectTypeOf(handler.loadConfig).toEqualTypeOf<
      StepHandler<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']>['loadConfig']
    >()
    expectTypeOf(handler.validateInput).toEqualTypeOf<
      StepHandler<RawConfig, SerializedConfig, RC, M['inputDataTypes'], M['outputDataType']>['validateInput']
    >()
  })
})
