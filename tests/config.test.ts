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

type InstanceType<T> = T extends new (...args: any[]) => infer R ? R : never;

type UnionFromArray<T extends readonly any[]> = T[number];

type InstanceUnionFromConstructorArray<T extends readonly any[]> =
  InstanceType<UnionFromArray<T>>;

type Options<
  C = {},
  RC = Reactive<C>,
  SC = C,
  I extends readonly DataTypeConstructor[] = readonly DataTypeConstructor[],
  O extends DataTypeConstructor = DataTypeConstructor
> = {
  config?: () => C
  reactiveConfig?: (defaults: C) => RC
  run?: (options: {
    config: RC,
    inputData: InstanceUnionFromConstructorArray<I>
  }) => {
    output: InstanceType<O>,
    config: RC
  }
  serializeConfig?: (config: RC) => SC
  deserializeConfig?: (serializedConfig: SC) => C
  loadConfig?: (config: RC, serializedConfig: SC) => void
}

function useHandler<
  C = {},
  RC = Reactive<C>,
  SC = C,
  I extends readonly DataTypeConstructor[] = readonly DataTypeConstructor[],
  O extends DataTypeConstructor = DataTypeConstructor
>(meta: Meta<I, O>, options?: Options<C, RC, SC, I, O>) {
  type Config = C extends {} ? (undefined extends C ? {} : C) : C
  type ReactiveConfig = RC extends Reactive<C> ? RC : Reactive<Config>
  type InputData = InstanceUnionFromConstructorArray<I>
  type OutputData = InstanceType<O>

  const defaultConfig = (() => ({} as Config))
  const defaultReactiveConfig = (defaults: Config) => reactive(defaults as object) as ReactiveConfig
  const defaultRun = (runOptions: { config: ReactiveConfig, inputData: InputData }) => ({
    config: runOptions.config as RC,
    output: null as OutputData | null,
  })

  const defaultSerializeConfig = (config: RC) => config as unknown as SC
  const defaultDeserializeConfig = (serialized: SC) => serialized as unknown as Config

  const deserializeConfig = (options?.deserializeConfig ?? defaultDeserializeConfig) as (serialized: SC) => Config

  const defaultLoadConfig = (config: RC, serializedConfig: SC) => {
    const deserialized = deserializeConfig(serializedConfig)
    Object.assign(config as any, deserialized)
  }
  const loadConfig = (options?.loadConfig ?? defaultLoadConfig) as (config: RC, serializedConfig: SC) => void

  return {
    meta,
    config: (options?.config ?? defaultConfig) as () => Config,
    reactiveConfig: (options?.reactiveConfig ?? defaultReactiveConfig) as (defaults: Config) => ReactiveConfig,
    serializeConfig: (options?.serializeConfig ?? defaultSerializeConfig) as (config: Config) => SC,
    deserializeConfig,
    loadConfig,
    run: (options?.run ?? defaultRun) as (options: { config: ReactiveConfig, inputData: InputData }) => {
      config: RC,
      output: OutputData | null
    },
  }
}

describe('config test', () => {
  const meta: Meta = {
    inputDataTypes: [DA, DB],
    outputDataType: DC,
  }

  it('handles defaults', () => {
    type C = {}
    type RC = Reactive<C>
    const handler = useHandler(meta)

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

    const handler = useHandler(meta, {
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

    const handler = useHandler(meta, {
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

    const handler = useHandler(meta, {
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

    const handler = useHandler(meta, {
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

    const handler = useHandler(meta, {
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

    const handler = useHandler(meta, {
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

    const handler = useHandler(meta, {
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