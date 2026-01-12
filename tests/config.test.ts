import { expectTypeOf } from 'expect-type'
import { describe, expect, it } from 'vitest'
import { isReactive, type Reactive, reactive, type ShallowReactive, shallowReactive } from 'vue'

class Base {
  __base = 'base'
}

class DA extends Base {
  name = 'A'
}

class DB extends Base {
  name = 'B'
}

class DC extends Base {
  name = 'C'
}

type DataTypeConstructor =
  | typeof DA
  | typeof DB
  | typeof DC

// type DataTypeInstance = DA | DB | DC

type Meta<
  I = readonly DataTypeConstructor[],
  O = DataTypeConstructor
> = {
  inputDataTypes: I,
  outputDataType: O
}

type UnionFromArray<T extends readonly any[]> = T[number];

type InstanceUnionFromConstructorArray<T extends readonly any[]> =
  InstanceType<UnionFromArray<T>>;

type BaseOptions<
  C = {},
  RC = Reactive<C>,
  SC = C,
  I extends readonly DataTypeConstructor[] = readonly DataTypeConstructor[],
  O extends DataTypeConstructor = DataTypeConstructor,
  RunOptions = { config: RC, inputData: InstanceUnionFromConstructorArray<I> }
> = {
  config?: () => C
  reactiveConfig?: (defaults: C) => RC
  run?: (options: RunOptions) => {
    output: InstanceType<O>,
    config: RC
  }
  serializeConfig?: (config: RC) => SC
  deserializeConfig?: (serializedConfig: SC) => C
  loadConfig?: (config: RC, serializedConfig: SC) => void
}

type NormalizedConfig<C> = C extends {} ? (undefined extends C ? {} : C) : C
type NormalizedReactiveConfig<C, RC> = RC extends Reactive<C> ? RC : Reactive<NormalizedConfig<C>>

function baseHandler<
  C,
  RC,
  SC,
  I extends readonly DataTypeConstructor[],
  O extends DataTypeConstructor,
  RunOptions
>(
  meta: Meta<I, O>,
  options: BaseOptions<C, RC, SC, I, O, RunOptions> | undefined,
  defaultRun: (runOptions: RunOptions) => any,
) {
  type Config = NormalizedConfig<C>
  type ReactiveConfig = NormalizedReactiveConfig<C, RC>
  type OutputData = InstanceType<O>

  const defaults = {
    config: (() => ({} as Config)),
    reactiveConfig: ((defaults: Config) => reactive(defaults as object) as ReactiveConfig),
    run: defaultRun,
    serializeConfig: ((config: RC) => config as unknown as SC),
    deserializeConfig: ((serialized: SC) => serialized as unknown as Config),
    loadConfig: ((config: RC, serializedConfig: SC) => {
      const deserialized = deserializeConfig(serializedConfig)
      Object.assign(config as any, deserialized)
    }),
  }

  const config = options?.config ?? defaults.config
  const reactiveConfig = options?.reactiveConfig ?? defaults.reactiveConfig
  const run = options?.run ?? defaultRun
  const serializeConfig = options?.serializeConfig ?? defaults.serializeConfig
  const deserializeConfig = options?.deserializeConfig ?? defaults.deserializeConfig
  const loadConfig = options?.loadConfig ?? defaults.loadConfig

  return {
    meta,
    config: config as () => Config,
    reactiveConfig: reactiveConfig as (defaults: Config) => ReactiveConfig,
    serializeConfig: serializeConfig as (config: Config) => SC,
    deserializeConfig: deserializeConfig as (serialized: SC) => Config,
    loadConfig: loadConfig as (config: RC, serializedConfig: SC) => void,
    run: run as (options: RunOptions) => { config: RC, output: OutputData | null },
  }
}

type HandlerReturn<
  C,
  RC,
  SC,
  I extends readonly DataTypeConstructor[],
  O extends DataTypeConstructor,
  RunOptions
> = {
  meta: Meta<I, O>
  config: () => NormalizedConfig<C>
  reactiveConfig: (defaults: NormalizedConfig<C>) => NormalizedReactiveConfig<C, RC>
  serializeConfig: (config: NormalizedConfig<C>) => SC
  deserializeConfig: (serialized: SC) => NormalizedConfig<C>
  loadConfig: (config: RC, serializedConfig: SC) => void
  run: (options: RunOptions) => {
    config: RC
    output: InstanceType<O> | null
  }
}

type HandlerAReturn<
  C = {},
  RC = Reactive<C>,
  SC = C,
  I extends readonly DataTypeConstructor[] = readonly DataTypeConstructor[],
  O extends DataTypeConstructor = DataTypeConstructor
> = HandlerReturn<
  C,
  RC,
  SC,
  I,
  O,
  { config: NormalizedReactiveConfig<C, RC>, inputData: InstanceUnionFromConstructorArray<I> }
>

type HandlerBReturn<
  C = {},
  RC = Reactive<C>,
  SC = C,
  I extends readonly
    DataTypeConstructor[] = readonly
    DataTypeConstructor[],
  O extends DataTypeConstructor = DataTypeConstructor
> = HandlerReturn<
  C,
  RC,
  SC,
  I,
  O,
  { config: RC, inputData: InstanceUnionFromConstructorArray<I>, branchIndex: number }
>

function useHandlerA<
  C = {},
  RC = Reactive<C>,
  SC = C,
  I extends readonly DataTypeConstructor[] = readonly DataTypeConstructor[],
  O extends DataTypeConstructor = DataTypeConstructor
>(
  meta: Meta<I, O>,
  options?: BaseOptions<C, RC, SC, I, O, {
    config: NormalizedReactiveConfig<C, RC>,
    inputData: InstanceUnionFromConstructorArray<I>
  }>,
): HandlerAReturn<C, RC, SC, I, O> {
  return baseHandler(meta, options, (runOptions: any) => ({
    config: runOptions.config,
    output: null,
  }))
}

export function useHandlerB<
  C = {},
  RC = Reactive<C>,
  SC = C,
  I extends readonly DataTypeConstructor[] = readonly DataTypeConstructor[],
  O extends DataTypeConstructor = DataTypeConstructor
>(
  meta: Meta<I, O>,
  options?: BaseOptions<C, RC, SC, I, O, {
    config: RC,
    inputData: InstanceUnionFromConstructorArray<I>,
    branchIndex: number
  }>,
): HandlerBReturn<C, RC, SC, I, O> {
  return baseHandler(meta, options, (runOptions: any) => ({
    config: runOptions.config,
    output: null,
  }))
}

describe('config test', () => {
  const meta: Meta = {
    inputDataTypes: [DA, DB],
    outputDataType: DC,
  }

  it('handles defaults', () => {
    type C = {}
    type RC = Reactive<C>
    const handler = useHandlerA(meta)

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC, inputData: DA | DB }) => {
      config: RC,
      output: DC | null
    })>()

    const config = handler.config()
    expect(config).toEqual({})
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({})
    expect(handler.run({ config: reactiveConfig, inputData: new DB() })).toEqual({
      config: reactiveConfig,
      output: null,
    })
  })

  it('handles config only', () => {
    type C = { foo: string }
    type RC = Reactive<C>

    const handler = useHandlerA(meta, {
      config: () => ({ foo: 'bar' }),
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC, inputData: DA | DB }) => {
      config: RC,
      output: DC | null
    })>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig, inputData: new DA() })).toEqual({
      config: reactiveConfig,
      output: null,
    })
  })

  it('handles config + reactiveConfig ', () => {
    type C = { foo: string }
    type RC = ShallowReactive<C>

    const handler = useHandlerA(meta, {
      config: () => ({ foo: 'bar' }),
      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults)
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC, inputData: DA | DB }) => {
      config: RC,
      output: DC | null
    })>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig, inputData: new DA() })).toEqual({
      config: reactiveConfig,
      output: null,
    })
  })

  it('handles config + reactiveConfig + run', () => {
    type C = { foo: string }
    type RC = ShallowReactive<C>

    const handler = useHandlerA(meta, {
      config: () => ({ foo: 'bar' }),
      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults)
      },
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          config,
          output: new DC(),
        }
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC, inputData: DA | DB }) => {
      config: RC,
      output: DC | null
    })>()
    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig, inputData: new DB() })).toEqual({
      config: reactiveConfig,
      output: new DC(),
    })
  })

  it('handles config + run', () => {
    type C = { foo: string }
    type RC = Reactive<C>

    const handler = useHandlerA(meta, {
      config: () => ({ foo: 'bar' }),
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          config,
          output: new DC(),
        }
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC, inputData: DA | DB }) => {
      config: RC,
      output: DC | null
    })>()
    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig, inputData: new DA() })).toEqual({
      config: reactiveConfig,
      output: new DC(),
    })
  })

  it('handles run', () => {
    type C = {}
    type RC = Reactive<C>

    const handler = useHandlerA(meta, {
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          config,
          output: new DC(),
        }
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC, inputData: DA | DB }) => {
      config: RC,
      output: DC | null
    })>()
    const config = handler.config()
    expect(config).toEqual({})
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({})
    expect(handler.run({ config: reactiveConfig, inputData: new DB() })).toEqual({
      config: reactiveConfig,
      output: new DC(),
    })
  })

  it('handles config + serializeConfig + deserializeConfig + loadConfig', () => {
    type C = { foo: string }
    type RC = Reactive<C>
    type SC = { serializedFoo: string }

    const handler = useHandlerA(meta, {
      config() {
        return {
          foo: 'bar',
        }
      },
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        if (!isReactive(config)) throw new Error('config is not reactive')

        return {
          config,
          output: new DC(),
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
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC, inputData: DA | DB }) => {
      config: RC,
      output: DC | null
    })>()
    expectTypeOf(handler.serializeConfig).toEqualTypeOf<((deserialized: C) => SC)>()
    expectTypeOf(handler.deserializeConfig).toEqualTypeOf<((serialized: SC) => C)>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig, inputData: new DA() })).toEqual({
      config: reactiveConfig,
      output: new DC(),
    })
    expect(handler.serializeConfig({ foo: 'test' })).toEqual({ serializedFoo: 'test' })
    expect(handler.deserializeConfig({ serializedFoo: 'test2' })).toEqual({ foo: 'test2' })
  })

  it('handles config + loadConfig', () => {
    type C = { foo: string }
    type RC = Reactive<C>
    type SC = { foo: string }

    const handler = useHandlerA(meta, {
      config() {
        return {
          foo: 'bar',
        }
      },
      run({ config, inputData }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(inputData).toEqualTypeOf<DA | DB>()
        if (!isReactive(config)) throw new Error('config is not reactive')
        return {
          config,
          output: new DC(),
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
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC, inputData: DA | DB }) => {
      config: RC,
      output: DC | null
    })>()
    expectTypeOf(handler.serializeConfig).toEqualTypeOf<((deserialized: C) => SC)>()
    expectTypeOf(handler.deserializeConfig).toEqualTypeOf<((serialized: SC) => C)>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig, inputData: new DA() })).toEqual({
      config: reactiveConfig,
      output: new DC(),
    })

    expect(handler.serializeConfig({ foo: 'test' })).toEqual({ foo: 'test' })
    expect(handler.deserializeConfig({ foo: 'test2' })).toEqual({ foo: 'test2' })
  })
})