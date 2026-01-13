import { expectTypeOf } from 'expect-type'
import { describe, expect, it } from 'vitest'
import { isReactive, type Reactive, shallowReactive, type ShallowReactive } from 'vue'
import {
  type IRunnerResultMeta,
  NodeType,
  type StepInputTypesToInstances,
} from '../src/lib/pipeline/_types.ts'
import type { StepValidationError } from '../src/lib/pipeline/errors/StepValidationError.ts'
import {
  makeStepHandler,
  type StepHandler,
  type StepHandlerOptions,
} from '../src/lib/pipeline/NodeHandler/StepHandler.ts'
import type { NormalRunner, SingleRunnerOutput } from '../src/lib/pipeline/NodeRunner.ts'
import { defineNodeMeta } from '../src/lib/pipeline/types/definitions.ts'

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

const STEP_META = defineNodeMeta({
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

  type C = RawConfig
  type RC = Reactive<C>

  const inputData = new A(1, 1)
  const output = new COut(1, 1)

  it('handles defaults', async () => {
    type C = {}
    type RC = Reactive<C>
    const handler = makeStepHandler(STEP_META)

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()
    expectTypeOf<ReturnType<typeof handler.run>>().toEqualTypeOf<Promise<
      SingleRunnerOutput<COut>
    >>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    const config = handler.config()
    expect(config).toEqual({})
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({})
    expect(await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })).toEqual({
      output: inputData,
      preview: null,
      meta: null,
    })
  })

  it('handles config only', async () => {
    type C = { foo: string }
    type RC = Reactive<C>

    const handler = makeStepHandler(STEP_META, {
      config: () => ({ foo: 'bar' }),
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<COut>>
    >()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    const result = await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })
    expect(result).toEqual({
      preview: null,
      meta: null,
      output: inputData,
    })
  })

  it('handles config + reactiveConfig ', async () => {
    type C = { foo: string }
    type RC = ShallowReactive<C>

    const handler = makeStepHandler(STEP_META, {
      config: () => ({ foo: 'bar' }),
      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults)
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<COut>>
    >()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    const result = await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })
    expect(result).toEqual({
      preview: null,
      meta: null,
      output: inputData,
    })
  })

  it('handles config + reactiveConfig + run', async () => {
    type C = { foo: string }
    type RC = ShallowReactive<C>

    const handler = makeStepHandler(STEP_META, {
      config: () => ({ foo: 'bar' }),
      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults)
      },
      async run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          output,
        }
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<COut>>
    >()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    const result = await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })
    expect(result?.output).toBe(
      output,
    )
  })

  it('handles config + run', async () => {
    type C = { foo: string }
    type RC = Reactive<C>

    const handler = makeStepHandler(STEP_META, {
      config: () => ({ foo: 'bar' }),
      async run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          output,
        }
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<COut>>
    >()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    const result = await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })
    expect(result?.output).toBe(
      output,
    )
  })

  it('handles nested spread config + run', async () => {
    const CONFIG = {
      foo: 'bar',
      blah: {
        thing: 'something'
      }
    }

    type C = typeof CONFIG
    type RC = Reactive<C>

    const handler = makeStepHandler(STEP_META, {
      config() {
        return { ...CONFIG }
      },
      async run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          output,
        }
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<COut>>
    >()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    const config = handler.config()
    expect(config).toEqual(CONFIG)
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual(CONFIG)
    const result = await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })
    expect(result?.output).toBe(
      output,
    )
  })

  it('handles run', async () => {
    type C = {}
    type RC = Reactive<C>

    const handler = makeStepHandler(STEP_META, {
      async run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          output,
        }
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<COut>>
    >()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    const config = handler.config()
    expect(config).toEqual({})
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({})
    const result = await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })
    expect(result?.output).toBe(
      output,
    )
  })

  it('handles config + serializeConfig + deserializeConfig + loadConfig', async () => {
    type C = { foo: string }
    type RC = Reactive<C>
    type SC = { serializedFoo: string }

    const handler = makeStepHandler(STEP_META, {
      config() {
        return {
          foo: 'bar',
        }
      },
      async run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          output,
        }
      },

      serializeConfig(config) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        return {
          serializedFoo: config.foo,
        }
      },
      deserializeConfig(serialized) {
        expectTypeOf(serialized).toEqualTypeOf<SC>()
        return {
          foo: serialized.serializedFoo,
        }
      },
      loadConfig(config, serializedConfig) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(serializedConfig).toEqualTypeOf<SC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<COut>>
    >()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    const result = await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })
    expect(result?.output).toBe(
      output,
    )
    expect(handler.serializeConfig({ foo: 'test' })).toEqual({ serializedFoo: 'test' })
    expect(handler.deserializeConfig({ serializedFoo: 'test2' })).toEqual({ foo: 'test2' })
  })

  it('handles config + loadConfig', async () => {
    type C = { foo: string }
    type RC = Reactive<C>
    type SC = { foo: string }

    const handler = makeStepHandler(STEP_META, {
      config() {
        return {
          foo: 'bar',
        }
      },
      async run({ config, inputData }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(inputData).toEqualTypeOf<A | B | null>()
        if (!isReactive(config)) throw new Error('config is not reactive')
        return {
          output,
        }
      },

      loadConfig(config, serializedConfig) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(serializedConfig).toEqualTypeOf<SC>()

        if (!isReactive(config)) throw new Error('config is not reactive')
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()

    expectTypeOf(handler.run).parameters.toEqualTypeOf<[{
      config: RC,
      inputData: A | B | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta | null
    }]>()

    expectTypeOf<Parameters<typeof handler.run>[0]['config']>().toEqualTypeOf<RC>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputData']>().toEqualTypeOf<A | B | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['inputPreview']>().toEqualTypeOf<ImageData | null>()
    expectTypeOf<Parameters<typeof handler.run>[0]['meta']>().toEqualTypeOf<IRunnerResultMeta | null>()

    expectTypeOf(handler.run).returns.toEqualTypeOf<
      Promise<SingleRunnerOutput<COut>>
    >()

    expectTypeOf(handler.run).toEqualTypeOf<{
      __normal?: never
      (options: {
        config: RC
        inputData: A | B | null
        inputPreview: ImageData | null
        meta: IRunnerResultMeta | null
      }): Promise<SingleRunnerOutput<COut>>
    }>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    const result = await handler.run({
      config: reactiveConfig,
      inputData,
      inputPreview: null,
      meta: null,
    })
    expect(result?.output).toBe(
      output,
    )

    expect(handler.serializeConfig({ foo: 'test' })).toEqual({ foo: 'test' })
    expect(handler.deserializeConfig({ foo: 'test2' })).toEqual({ foo: 'test2' })
  })
})
