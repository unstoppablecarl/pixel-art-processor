import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import { reactive, type Reactive, type ShallowReactive, shallowReactive } from 'vue'

// type Options = {}

type Options<C = {},
  RC = Reactive<C>
> = {
  config?: () => C
  reactiveConfig?: (defaults: C) => RC
  run?: (options: { config: RC }) => void
}

function useHandler<
  C = {},
  RC = Reactive<C>
>(options?: Options<C, RC>) {
  type Config = C extends {} ? (undefined extends C ? {} : C) : C
  type ReactiveConfig = RC extends Reactive<C> ? RC : Reactive<Config>

  return {
    config: options?.config as () => Config,
    reactiveConfig: options?.reactiveConfig
      ? (options.reactiveConfig as (defaults: Config) => ReactiveConfig)
      : ((defaults: Config) => reactive(defaults as object) as ReactiveConfig),
    run: options?.run as ((options: { config: ReactiveConfig }) => void),
  } as {
    config: () => Config
    reactiveConfig: (defaults: Config) => ReactiveConfig
    run: (options: { config: ReactiveConfig }) => void
  }
}

describe('config test', () => {
  it('handles defaults', () => {
    type C = {}
    type RC = Reactive<C>
    const handler = useHandler()

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => void)>()
  })

  it('handles config only', () => {
    type C = { foo: string }
    type RC = Reactive<C>

    const handler = useHandler({
      config: () => ({ foo: 'bar' }),
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => void)>()
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
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => void)>()
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
      },

    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => void)>()
  })

  it('handles config + run', () => {
    type C = { foo: string }
    type RC = Reactive<C>

    const handler = useHandler({
      config: () => ({ foo: 'bar' }),
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => void)>()
  })

  it('handles run', () => {
    type C = {}
    type RC = Reactive<C>

    const handler = useHandler({
      run({ config }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
      },
    })

    expectTypeOf(handler.config).toEqualTypeOf<() => C>()
    expectTypeOf(handler.reactiveConfig).toEqualTypeOf<(defaults: C) => RC>()
    expectTypeOf(handler.run).toEqualTypeOf<((options: { config: RC }) => void)>()
  })
})