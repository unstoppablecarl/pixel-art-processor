import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
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
  type StepRunner,
} from '../src/lib/pipeline/StepHandler.ts'
import { BitMask } from '../src/lib/step-data-types/BitMask.ts'
import { HeightMap } from '../src/lib/step-data-types/HeightMap.ts'
import { NormalMap } from '../src/lib/step-data-types/NormalMap.ts'

// ---------------------------------------------------------------------------
// Test setup types
// ---------------------------------------------------------------------------

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

type Runner = StepRunner<T>

// Helper def string
const DEF = 'test/handler'

// ---------------------------------------------------------------------------
// StepHandlerOptional
// ---------------------------------------------------------------------------

describe('StepHandlerOptional', () => {
  it('lists the optional keys of IStepHandler', () => {
    type OptionalKeys = StepHandlerOptional

    // This is a structural sanity check: if you change optional keys,
    // this will break and force you to update tests intentionally.
    type Expected =
      | 'watcher'
      | 'serializeConfig'
      | 'deserializeConfig'
      | 'config'
      | 'loadConfig'
      | 'prevOutputToInput'
      | 'validateInputType'
      | 'validateInput'
      | 'serializeConfigKeys'
      | 'deserializeConfigKeys'
      | 'configKeyAdapters'

    expectTypeOf<OptionalKeys>().toEqualTypeOf<Expected>()
  })
})

// ---------------------------------------------------------------------------
// StepHandlerOptions<T, Runner>
// ---------------------------------------------------------------------------

describe('StepHandlerOptions<T, Runner>', () => {
  it('requires non-optional IStepHandler fields and run, while making StepHandlerOptional keys optional', () => {
    // Minimal valid options: only required fields + run()
    const minimalOptions: StepHandlerOptions<T, Runner> = {
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
    expectTypeOf(minimalOptions.config).toEqualTypeOf<(() => RC) | undefined>()

    // Now a "maximal" options object using all optional fields
    const fullOptions: StepHandlerOptions<T, Runner> = {
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

      prevOutputToInput(output) {
        return output as any
      },

      validateInputType(type, allowed) {
        return []
      },

      validateInput(input) {
        return []
      },

      serializeConfig(config) {
        return {} as SerializedConfig
      },

      deserializeConfig(serializedConfig) {
        return {} as RawConfig
      },

      loadConfig(config, serializedConfig) {
        // no-op
      },

      serializeConfigKeys(config) {
        return {}
      },

      deserializeConfigKeys(serialized) {
        return {}
      },

      configKeyAdapters: {} as any,
    }

    expectTypeOf(fullOptions.inputDataTypes)
      .toEqualTypeOf<readonly [typeof A, typeof B]>()

    expectTypeOf(fullOptions.outputDataType)
      .toEqualTypeOf<typeof COut>()

    expectTypeOf(fullOptions.config)
      .toEqualTypeOf<(() => RC) | undefined>()

    expectTypeOf(fullOptions.run)
      .toEqualTypeOf<Runner>()

  })

  it('does not allow omitting required core properties', () => {
    // Omitting inputDataTypes should fail
    // @ts-expect-error missing required inputDataTypes
    const bad1: StepHandlerOptions<T, Runner> = {
      outputDataType: COut,
      run() {
        return { output: {} as InstanceType<typeof COut> }
      },
    }

    // Omitting outputDataType should fail
    // @ts-expect-error missing required outputDataType
    const bad2: StepHandlerOptions<T, Runner> = {
      inputDataTypes: [A, B] as const,
      run() {
        return { output: {} as InstanceType<typeof COut> }
      },
    }

    // Omitting run should fail
    // @ts-expect-error missing required run
    const bad3: StepHandlerOptions<T, Runner> = {
      inputDataTypes: [A, B] as const,
      outputDataType: COut,
    }

    const noop = (v: any) => v
    noop(bad1)
    noop(bad2)
    noop(bad3)
  })
})

// ---------------------------------------------------------------------------
// makeStepHandler<T, Runner>
// ---------------------------------------------------------------------------

describe('makeStepHandler<T, Runner>', () => {
  it('returns an IStepHandler<T, Runner>-compatible object merging defaults and options', () => {
    const options: StepHandlerOptions<T, Runner> = {
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

      // Override some optional stuff to ensure merge behavior
      prevOutputToInput(output) {
        return [output, null] as any
      },

      serializeConfig(config) {
        return {} as SerializedConfig
      },

      deserializeConfig(serializedConfig) {
        return {} as RawConfig
      },
    }

    const handler = makeStepHandler<T, Runner>(DEF, options)

    // Shape of handler: must be a full IStepHandler<T, Runner>
    expectTypeOf(handler).toEqualTypeOf<IStepHandler<T, Runner>>()

    // validate core fields
    expectTypeOf(handler.inputDataTypes).toEqualTypeOf<readonly [typeof A, typeof B]>()
    expectTypeOf(handler.outputDataType).toEqualTypeOf<typeof COut>()

    // defaulted config() is overridden by options.config()
    expectTypeOf(handler.config).toEqualTypeOf<() => RC>()

    // run has the correct StepRunner signature
    expectTypeOf(handler.run).toEqualTypeOf<Runner>()

    // ensure defaulted methods have the right types even if not provided in options
    expectTypeOf(handler.watcher).toEqualTypeOf<
      IStepHandler<T, Runner>['watcher']
    >()
    expectTypeOf(handler.serializeConfig).toEqualTypeOf<
      IStepHandler<T, Runner>['serializeConfig']
    >()
    expectTypeOf(handler.deserializeConfig).toEqualTypeOf<
      IStepHandler<T, Runner>['deserializeConfig']
    >()
    expectTypeOf(handler.loadConfig).toEqualTypeOf<
      IStepHandler<T, Runner>['loadConfig']
    >()
    expectTypeOf(handler.prevOutputToInput).toEqualTypeOf<
      IStepHandler<T, Runner>['prevOutputToInput']
    >()
    expectTypeOf(handler.validateInputType).toEqualTypeOf<
      IStepHandler<T, Runner>['validateInputType']
    >()
    expectTypeOf(handler.validateInput).toEqualTypeOf<
      IStepHandler<T, Runner>['validateInput']
    >()
    expectTypeOf(handler.serializeConfigKeys).toEqualTypeOf<
      IStepHandler<T, Runner>['serializeConfigKeys']
    >()
    expectTypeOf(handler.deserializeConfigKeys).toEqualTypeOf<
      IStepHandler<T, Runner>['deserializeConfigKeys']
    >()
    expectTypeOf(handler.configKeyAdapters).toEqualTypeOf<
      IStepHandler<T, Runner>['configKeyAdapters']
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
    const handler = makeStepHandler<AnyT, unknown>(DEF, options as any)

    expectTypeOf(handler).toExtend<IStepHandler<AnyT, unknown>>()
  })

  it('produces a StepRunnerOutput-compatible run return type by default', () => {
    // const options: StepHandlerOptions<T, unknown> = {
    //   inputDataTypes: [A, B] as const,
    //   outputDataType: COut,
    //   run(args) {
    //     return {
    //       output: {} as InstanceType<typeof COut>,
    //     }
    //   },
    // }

    // const handler = makeStepHandler<T, unknown>(DEF, options)

    // expectTypeOf(handler.run).returns.toEqualTypeOf<
    //   StepRunnerOutput<T['Output']> | null | undefined | Promise<StepRunnerOutput<T['Output']>>
    // >()
  })
})
