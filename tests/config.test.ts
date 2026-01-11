import { expectTypeOf } from 'expect-type'
import { describe, expect, it } from 'vitest'
import { reactive, type Reactive, type ShallowReactive, shallowReactive } from 'vue'

type Options<
  C = {},
  RC = Reactive<C>,
  SC = {}
> = {
  config?: () => C
  reactiveConfig?: (defaults: C) => RC
  run?: (options: { config: RC }) => RC
  serializeConfig?: (config: C) => SC
  deserializeConfig?: (serializedConfig: SC) => C
}

function useHandler<
  C = {},
  RC = Reactive<C>,
  SC = {}
>(options?: Options<C, RC, SC>) {
  type Config = C extends {} ? (undefined extends C ? {} : C) : C
  type ReactiveConfig = RC extends Reactive<C> ? RC : Reactive<Config>

  const defaultConfig = (() => ({} as Config))
  const defaultReactiveConfig = (defaults: Config) => reactive(defaults as object) as ReactiveConfig
  const defaultRun = (runOptions: { config: ReactiveConfig }) => runOptions.config as RC

  const defaultSerializeConfig = (config: RC) => config as unknown as SC
  const defaultDeSerializeConfig = (serialized: SC) => serialized as unknown as C

  return {
    config: (options?.config ?? defaultConfig) as () => Config,
    reactiveConfig: (options?.reactiveConfig ?? defaultReactiveConfig) as (defaults: Config) => ReactiveConfig,
    serializeConfig: (options?.serializeConfig ?? defaultSerializeConfig) as (config: RC) => SC,
    deserializeConfig: (options?.deserializeConfig ?? defaultDeSerializeConfig) as (serialized: SC) => C,
    run: (options?.run ?? defaultRun) as (options: { config: ReactiveConfig }) => RC,
  }
}

describe('config test', () => {
  it('handles defaults', () => {
    type C = {}
    type RC = Reactive<C>
    const handler = useHandler()

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => RC)>()

    const config = handler.config()
    expect(config).toEqual({})
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({})
    expect(handler.run({ config: reactiveConfig })).toEqual(reactiveConfig)
  })

  it('handles config only', () => {
    type C = { foo: string }
    type RC = Reactive<C>

    const handler = useHandler({
      config: () => ({ foo: 'bar' }),
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => RC)>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig })).toEqual(reactiveConfig)
  })

  it('handles config + reactiveConfig ', () => {
    type C = { foo: string }
    type RC = ShallowReactive<C>

    const handler = useHandler({
      config: () => ({ foo: 'bar' }),
      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults)
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => RC)>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig })).toEqual(reactiveConfig)
  })

  it('handles config + reactiveConfig + run', () => {
    type C = { foo: string }
    type RC = ShallowReactive<C>

    const handler = useHandler({
      config: () => ({ foo: 'bar' }),
      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults)
      },
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        return config
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => RC)>()
    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig })).toEqual(reactiveConfig)
  })

  it('handles config + run', () => {
    type C = { foo: string }
    type RC = Reactive<C>

    const handler = useHandler({
      config: () => ({ foo: 'bar' }),
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        return config
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => RC)>()
    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig })).toEqual(reactiveConfig)
  })

  it('handles run', () => {
    type C = {}
    type RC = Reactive<C>

    const handler = useHandler({
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        return config
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => RC)>()
    const config = handler.config()
    expect(config).toEqual({})
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({})
    expect(handler.run({ config: reactiveConfig })).toEqual(reactiveConfig)
  })

  it('handles config + serializeConfig', () => {
    type C = { foo: string }
    type RC = Reactive<C>
    type SC = { serializedFoo: string }

    const handler = useHandler({
      config() {
        return {
          foo: 'bar',
        }
      },
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()

        return config
      },

      serializeConfig(config) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        return {
          serializedFoo: config.foo,
        }
      },
      deserializeConfig(serialized: SC) {
        return {
          foo: serialized.serializedFoo,
        }
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => RC)>()
    expectTypeOf(handler.serializeConfig).toEqualTypeOf<((deserialized: C) => SC)>()
    expectTypeOf(handler.deserializeConfig).toEqualTypeOf<((serialized: SC) => C)>()

    const config = handler.config()
    expect(config).toEqual({ foo: 'bar' })
    const reactiveConfig = handler.reactiveConfig(config)
    expect(reactiveConfig).toEqual({ foo: 'bar' })
    expect(handler.run({ config: reactiveConfig })).toEqual(reactiveConfig)

    expect(handler.serializeConfig({foo: 'test'})).toEqual({serializedFoo: 'test'})
    expect(handler.deserializeConfig({serializedFoo: 'test2'})).toEqual({foo: 'test2'})

  })
})