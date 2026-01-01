import { describe, expectTypeOf, it } from 'vitest'
import { Reactive, reactive, type ShallowReactive, shallowReactive } from 'vue'
import { deepUnwrap } from '../src/lib/util/vue-util.ts'

class TypeA {
}

class TypeB {
}

class TypeC {
}

type NodeDataType =
  | typeof TypeA
  | typeof TypeB
  | typeof TypeC

type SerializedImageData = {
  width: number,
  height: number,
  data: number[],
}

function deserializeImageData(obj: SerializedImageData | null): ImageData | null {
  if (obj === null) return null

  return new ImageData(
    new Uint8ClampedArray(obj.data),
    obj.width,
    obj.height,
  )
}

function serializeImageData(imageData: ImageData | null): SerializedImageData | null {
  if (imageData === null) return null

  return {
    width: imageData.width,
    height: imageData.height,
    data: Array.from(imageData.data),
  }
}

type NodeValidationError = {}

type ConfiguredNode<T extends AnyNodeContext> =
  Required<Omit<Node<T>, 'config' | 'handler'>>
  & {
  config: NonNullable<Node<T>['config']>,
  handler: NonNullable<Node<T>['handler']>,
}

type WatcherTarget = {}
type NodeRunner<T extends AnyNodeContext> = ({ config, inputData }: {
  config: T['RC'],
  inputData: T['Input'] | null,
}) => NodeRunnerOutputMaybePromise<T['Output']>

type NodeRunnerOutputMaybePromise<Output> =
  | NodeRunnerOutput<Output>
  | Promise<NodeRunnerOutput<Output>>

type NodeRunnerOutput<Output> = null |
  undefined | {
  output: Output | null | undefined,
}

type Config = Record<string, any>

type Node<T extends AnyNodeContext> = {
  readonly id: string,
  readonly def: string,
  inputData: T['Input'] extends null ? null : T['Input'] | null,
  outputData: T['Output'] | T['Output'][] | null,
  config: T['RC'] | undefined,
  handler: INodeHandler<T> | undefined,
}

interface INodeHandler<T extends AnyNodeContext> {
  inputDataTypes: T['InputConstructors'],
  outputDataType: T['OutputConstructors'],

  // fresh default config instance
  config(): T['C']

  // wraps default config in reactivity
  reactiveConfig(defaults: T['C']): T['RC'],

  // watch config and trigger updates
  watcher(node: ConfiguredNode<T>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[],

  // apply loaded config to internal reactive config
  loadConfig(config: T['RC'], serializedConfig: T['SerializedConfig']): void,

  // convert config to storage
  serializeConfig(config: T['C']): T['SerializedConfig'],

  // convert config from storage
  deserializeConfig(serializedConfig: T['SerializedConfig']): T['C'],

  // validate the prevNode.outputDataType against currentNode.inputDataType
  validateInput(inputData: T['Input'], typeFromPrevOutput: T['Input'], inputDataTypes: T['InputConstructors']): NodeValidationError[],

  run: NodeRunner<T>,
}

type NodeInputTypesToInstances<Input extends readonly NodeDataType[] = readonly NodeDataType[]> = Input extends readonly []
  // first nodes do not have input so convert [] to null
  ? null
  : Input[number] extends NodeDataType
    // convert array of constructors to union of instances
    ? InstanceType<Input[number]>
    : never

type ReactiveConfigType<C extends Config> = ShallowReactive<C> | Reactive<C>;

type AnyNodeContext = NodeContext<any, any, any, any, any>

// Strict version for this harness (no defaults)
type NodeContext<
  C extends Config,
  SerializedConfig extends Config,
  RC extends ReactiveConfigType<C>,
  Input extends readonly NodeDataType[],
  Output extends NodeDataType,
> = {
  C: C,
  SerializedConfig: SerializedConfig,
  RC: RC,
  OutputConstructors: Output,
  InputConstructors: Input,
  Output: InstanceType<Output>,
  Input: NodeInputTypesToInstances<Input>,
}

type NodeHandlerOptions<T extends AnyNodeContext> = {
  inputDataTypes: T['InputConstructors']
  outputDataType: T['OutputConstructors']

  config: () => T['C']
  reactiveConfig: (defaults: T['C']) => T['RC']

  serializeConfig: (config: T['C']) => T['SerializedConfig']
  deserializeConfig: (config: T['SerializedConfig']) => T['C']

  watcher: (
    node: ConfiguredNode<T>,
  ) => void

  loadConfig: (config: T['RC'], serialized: T['SerializedConfig']) => void

  validateInput: (
    inputData: T['Input'],
    typeFromPrev: T['Input'],
    inputTypes: T['InputConstructors'],
  ) => NodeValidationError[],

  run: NodeRunner<T>
}

const inputDataTypes = [TypeB, TypeA] as const
const outputDataType = TypeC

const configRaw = {
  maskImageData: null as ImageData | null,
}

type C = typeof configRaw
type SC = { maskImageData: SerializedImageData | null }
type RC = ShallowReactive<C>
type I = typeof inputDataTypes
type O = typeof outputDataType

type InputInstances = TypeA | TypeB
type OutputInstance = TypeC

type NodeHandlerOptionsInfer<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly NodeDataType[],
  O extends NodeDataType,
> = {
  inputDataTypes: I
  outputDataType: O

  config: () => C,

  reactiveConfig: (defaults: C) => RC

  serializeConfig: (config: C) => SC
  deserializeConfig: (config: SC) => C

  watcher?: (node: ConfiguredNode<NodeContext<C, SC, RC, I, O>>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]
  loadConfig: (config: RC, serialized: SC) => void

  validateInput: (
    inputData: NodeInputTypesToInstances<I>,
    typeFromPrev: NodeInputTypesToInstances<I>,
    inputTypes: I,
  ) => NodeValidationError[]

  run: NodeRunner<NodeContext<C, SC, RC, I, O>>
}

type T = NodeContext<C, SC, RC, I, O>
type Options = NodeHandlerOptions<T>

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type NodeHandlerOptional =
  | 'watcher'
  | 'serializeConfig'
  | 'deserializeConfig'
  | 'config'
  | 'reactiveConfig'
  | 'loadConfig'
  | 'validateInput'

type NodeHandlerOptionsOptional<T extends AnyNodeContext> =
  Optional<INodeHandler<T>, NodeHandlerOptional>

function makeNodeHandler<T extends AnyNodeContext>(
  def: string,
  options: NodeHandlerOptionsOptional<T>,
): INodeHandler<T> {

  const base: Omit<INodeHandler<T>, 'run'> = {
    inputDataTypes: options.inputDataTypes,
    outputDataType: options.outputDataType,

    config() {
      return {} as T['C']
    },

    reactiveConfig(defaults) {
      return reactive(defaults) as T['RC']
    },

    watcher(node: ConfiguredNode<T>, defaultWatcherTargets: WatcherTarget[]) {
      return []
    },

    deserializeConfig(serializedConfig: T['SerializedConfig']): T['C'] {
      return { ...serializedConfig } as T['C']
    },

    serializeConfig(config: T['C']): T['SerializedConfig'] {
      const unwrapped = deepUnwrap(config)
      return { ...unwrapped } as T['SerializedConfig']
    },

    loadConfig(config: T['RC'], serializedConfig: T['SerializedConfig']): void {
      const deserialized = this.deserializeConfig(serializedConfig)
      Object.assign(config, deserialized)
    },

    validateInput(
      inputData: T['Input'],
      inputDataTypes: T['InputConstructors'],
    ): NodeValidationError[] {
      return []
    },
  }

  // Merge in any optional overrides from options
  return {
    ...base,
    ...options,
  } as INodeHandler<T>
}

function registerNode<T extends AnyNodeContext>(
  nodeId: string,
  handlerOptions: NodeHandlerOptionsOptional<T>,
): {
  node: Node<T>,
  handler: INodeHandler<T>
} {
  const node = {} as ConfiguredNode<T>

  const handler = makeNodeHandler<T>('test', handlerOptions)
  node.handler = handler

  return {
    node,
    handler,
  }
}

describe('handler harness tests', () => {
  it('handler options test', () => {

    const handlerOptions: Options = {
      inputDataTypes,
      outputDataType,

      config() {
        return {
          ...configRaw,
        }
      },

      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults) as RC
      },

      serializeConfig(config) {
        expectTypeOf(config).toEqualTypeOf<C>()
        return {
          maskImageData: serializeImageData(config.maskImageData),
        } as SC
      },

      deserializeConfig(config) {
        return {
          maskImageData: deserializeImageData(config.maskImageData),
        } as C
      },

      watcher(node) {
        expectTypeOf(node).toExtend<ConfiguredNode<T>>()
        expectTypeOf(node.config).toExtend<ConfiguredNode<T>['config']>()

        return [] as WatcherTarget[]
      },
      loadConfig(config, serialized) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(serialized).toExtend<SC>()
      },

      validateInput(inputData) {
        expectTypeOf(inputData).toEqualTypeOf<InputInstances>()
        return [] as NodeValidationError[]
      },
      run({ config, inputData }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()

        return { output: new TypeC() }
      },
    }
    expectTypeOf<typeof handlerOptions>().toEqualTypeOf<Options>()
    expectTypeOf<typeof handlerOptions.inputDataTypes>().toEqualTypeOf<I>()
    expectTypeOf<typeof handlerOptions.outputDataType>().toEqualTypeOf<O>()

    function assertHandlerOptions<
      C extends Config,
      SC extends Config,
      RC extends ReactiveConfigType<C>,
      I extends readonly NodeDataType[],
      O extends NodeDataType,
    >(
      options: NodeHandlerOptions<NodeContext<C, SC, RC, I, O>>,
      _configExample: C,
      _serializedConfigExample: SC,
      _inputExample: I,
      _outputExample: O,
    ) {
      type T = NodeContext<C, SC, RC, I, O>

      expectTypeOf(options).toExtend<NodeHandlerOptions<T>>()

      expectTypeOf<NodeHandlerOptions<T>['serializeConfig']>()
        .toEqualTypeOf<(config: C) => SC>()
      expectTypeOf<NodeHandlerOptions<T>['deserializeConfig']>()
        .toEqualTypeOf<(config: SC) => C>()

      expectTypeOf<NodeHandlerOptions<T>['run']>()
        .toEqualTypeOf<NodeRunner<T>>()
    }

    assertHandlerOptions<C, SC, RC, I, O>(
      {
        inputDataTypes,
        outputDataType,

        config() {
          return {
            ...configRaw,
          }
        },
        reactiveConfig(defaults) {
          return shallowReactive(defaults)
        },

        serializeConfig(config) {
          return {
            maskImageData: serializeImageData(config.maskImageData),
          }
        },

        deserializeConfig(config) {
          return {
            maskImageData: deserializeImageData(config.maskImageData),
          }
        },

        watcher(node) {
          return []
        },
        loadConfig(config, serialized) {
        },
        validateInput() {
          return []
        },
        run({ config, inputData }) {
          return { output: new TypeC() }
        },
      },
      configRaw,
      { maskImageData: null },
      inputDataTypes,
      outputDataType,
    )
  })

  it('test options', async () => {

    function assertHandlerOptions<
      C extends Config,
      SC extends Config,
      RC extends ReactiveConfigType<C>,
      I extends readonly NodeDataType[],
      O extends NodeDataType,
    >(
      options: NodeHandlerOptions<NodeContext<C, SC, RC, I, O>>,
      _configExample: C,
      _serializedConfigExample: SC,
      _inputExample: I,
      _outputExample: O,
    ) {
      type T = NodeContext<C, SC, RC, I, O>

      // 1) Core identity: the options *are* handler options for T
      expectTypeOf(options).toExtend<NodeHandlerOptions<T>>()

      // 3) Config relationships
      expectTypeOf<NodeHandlerOptions<T>['serializeConfig']>()
        .toEqualTypeOf<(config: C) => SC>()
      expectTypeOf<NodeHandlerOptions<T>['deserializeConfig']>()
        .toEqualTypeOf<(config: SC) => C>()

      // 4) Run signature
      expectTypeOf<NodeHandlerOptions<T>['run']>()
        .toEqualTypeOf<NodeRunner<T>>()
    }

    assertHandlerOptions<C, SC, RC, I, O>(
      {
        inputDataTypes,
        outputDataType,

        config() {
          return {
            ...configRaw,
          }
        },

        reactiveConfig(defaults) {
          expectTypeOf(defaults).toEqualTypeOf<C>()

          return shallowReactive(defaults) as RC
        },

        serializeConfig(config) {
          return {
            maskImageData: serializeImageData(config.maskImageData),
          }
        },

        deserializeConfig(config) {
          return {
            maskImageData: deserializeImageData(config.maskImageData),
          }
        },

        watcher(node) {
          return []
        },
        loadConfig(config, serialized) {
        },
        validateInput() {
          return []
        },
        run({ config, inputData }) {
          return { output: new TypeC() }
        },
      },
      configRaw,
      { maskImageData: null },
      inputDataTypes,
      outputDataType,
    )
  })

  it('makeNodeHandler with 2 input types', async () => {

    const handler = makeNodeHandler<T>('foo', {
      inputDataTypes,
      outputDataType,
      config(): RC {
        return shallowReactive(configRaw)
      },

      serializeConfig(config): SC {
        expectTypeOf(config).toEqualTypeOf<C>()

        return {
          maskImageData: serializeImageData(config.maskImageData),
        }
      },

      deserializeConfig(config): C {
        expectTypeOf(config).toEqualTypeOf<SC>()

        return {
          maskImageData: deserializeImageData(config.maskImageData),
        }
      },

      watcher(node): WatcherTarget[] {
        expectTypeOf(node).toEqualTypeOf<ConfiguredNode<T>>()
        return []
      },
      loadConfig(config, serialized): void {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(serialized).toEqualTypeOf<SC>()
      },
      validateInput(inputData) {
        expectTypeOf(inputData).toEqualTypeOf<TypeA | TypeB>()
        return []
      },
      run({ config, inputData }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(inputData).toEqualTypeOf<TypeA | TypeB | null>()

        return { output: new TypeC() }
      },
    })

    expectTypeOf(handler).toEqualTypeOf<INodeHandler<T>>()
  })

  it('registerNode', async () => {
    const { node, handler } = registerNode<T>('foo', {
      inputDataTypes,
      outputDataType,
      config(): RC {
        return shallowReactive(configRaw)
      },

      serializeConfig(config): SC {
        expectTypeOf(config).toEqualTypeOf<C>()

        return {
          maskImageData: serializeImageData(config.maskImageData),
        }
      },

      deserializeConfig(config): C {
        expectTypeOf(config).toEqualTypeOf<SC>()

        return {
          maskImageData: deserializeImageData(config.maskImageData),
        }
      },

      watcher(node): WatcherTarget[] {
        expectTypeOf(node).toEqualTypeOf<ConfiguredNode<T>>()
        return []
      },
      loadConfig(config, serialized): void {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(serialized).toEqualTypeOf<SC>()
      },
      validateInput(inputData) {
        expectTypeOf(inputData).toEqualTypeOf<TypeA | TypeB>()
        return []
      },

      run({ config, inputData }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(inputData).toEqualTypeOf<TypeA | TypeB | null>()

        return { output: new TypeC() }
      },
    })

    expectTypeOf(handler).toEqualTypeOf<INodeHandler<T>>()
    expectTypeOf(node).toEqualTypeOf<Node<T>>()
  })

  it('generic handler', () => {
    function useGenericHandler<
      C extends Config,
      SC extends Config,
      RC extends ReactiveConfigType<C>,
      I extends readonly NodeDataType[],
      O extends NodeDataType,
    >(
      nodeId: string,
      options: NodeHandlerOptionsInfer<C, SC, RC, I, O>,
    ) {
      return {} as ConfiguredNode<NodeContext<C, SC, RC, I, O>>
    }

    const node = useGenericHandler('testing', {
      inputDataTypes,
      outputDataType,

      config() {
        return {
          ...configRaw,
        }
      },

      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults) as RC
      },

      serializeConfig(config) {
        return {
          maskImageData: serializeImageData(config.maskImageData),
        }
      },

      deserializeConfig(config) {
        return {
          maskImageData: deserializeImageData(config.maskImageData),
        }
      },

      watcher(node) {
        return []
      },
      loadConfig(config, serialized) {
      },
      validateInput() {
        return []
      },
      run({ config, inputData }) {
        return { output: new TypeC() }
      },
    })

    expectTypeOf(node).toExtend<ConfiguredNode<NodeContext<C, SC, RC, I, O>>>()
  })

  it('realistic handler', () => {

    function useTestHandler<
      C extends Config,
      SC extends Config,
      RC extends ReactiveConfigType<C>,
      I extends readonly NodeDataType[],
      O extends NodeDataType,
    >(
      nodeId: string,
      options: NodeHandlerOptionsInfer<C, SC, RC, I, O>,
    ) {

      type T = NodeContext<C, SC, RC, I, O>
      const { node, handler } = registerNode<T>(nodeId, options)

      expectTypeOf(handler).toEqualTypeOf<INodeHandler<T>>()

      return node as ConfiguredNode<T>
    }

    const node = useTestHandler('testing', {
      inputDataTypes,
      outputDataType,

      config() {
        return {
          ...configRaw,
        }
      },

      reactiveConfig(defaults) {
        expectTypeOf(defaults).toEqualTypeOf<C>()

        return shallowReactive(defaults) as RC
      },

      serializeConfig(config) {
        expectTypeOf(config).toEqualTypeOf<C>()
        return {
          ...config,
          maskImageData: serializeImageData(config.maskImageData),
        } as SC
      },

      deserializeConfig(config) {
        expectTypeOf(config).toEqualTypeOf<SC>()
        return {
          ...config,
          maskImageData: deserializeImageData(config.maskImageData),
        } as C
      },

      watcher(node, defaultWatcherTargets) {
        expectTypeOf(node).toExtend<ConfiguredNode<T>>()
        expectTypeOf(node.config).toExtend<ConfiguredNode<T>['config']>()

        expectTypeOf(defaultWatcherTargets).toExtend<WatcherTarget[]>()

        return [
          ...defaultWatcherTargets,
        ]
      },
      loadConfig(config, serialized) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(serialized).toExtend<SC>()
      },
      validateInput(inputData) {
        expectTypeOf(inputData).toEqualTypeOf<InputInstances>()
        return [] as NodeValidationError[]
      },
      run({ config, inputData }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()

        return {
          preview: config.maskImageData,
          output: new TypeC(),
        }
      },
    })

    // should work with the prev declared T as well
    type T = typeof node extends ConfiguredNode<infer U> ? U : never

    expectTypeOf<T>().toEqualTypeOf<NodeContext<C, SC, RC, I, O>>()
    expectTypeOf(node).not.toEqualTypeOf<ConfiguredNode<AnyNodeContext>>()
    expectTypeOf(node).toExtend<ConfiguredNode<NodeContext<C, SC, RC, I, O>>>()
    expectTypeOf(node).toEqualTypeOf<ConfiguredNode<T>>()

    expectTypeOf(node.inputData).toEqualTypeOf<InputInstances | null>()
    expectTypeOf(node.outputData).toEqualTypeOf<OutputInstance | OutputInstance[] | null>()

    expectTypeOf(node.handler.run).toEqualTypeOf<
      INodeHandler<T>['run']
    >()
    expectTypeOf(node.handler.run).toEqualTypeOf<
      NodeRunner<T>
    >()
    expectTypeOf(node.handler.run).toEqualTypeOf<
      ({ config, inputData }: {
        config: RC,
        inputData: InputInstances | null
      }) => NodeRunnerOutputMaybePromise<OutputInstance>
    >()
    expectTypeOf(node.handler.run).parameters.toEqualTypeOf<[
      { config: RC, inputData: InputInstances | null }
    ]>()
    expectTypeOf(node.handler.run).returns.toEqualTypeOf<
      NodeRunnerOutputMaybePromise<OutputInstance>
    >()

    expectTypeOf(node.handler.config).toEqualTypeOf<
      INodeHandler<T>['config']
    >()
    expectTypeOf(node.handler.config).toEqualTypeOf<
      () => C
    >()

    expectTypeOf(node.handler.reactiveConfig).toEqualTypeOf<
      INodeHandler<T>['reactiveConfig']
    >()
    expectTypeOf(node.handler.reactiveConfig).toEqualTypeOf<
      (defaults: C) => RC
    >()

    expectTypeOf(node.handler.watcher).toEqualTypeOf<
      INodeHandler<T>['watcher']
    >()
    expectTypeOf(node.handler.watcher).toEqualTypeOf<
      (node: ConfiguredNode<T>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]
    >()

    expectTypeOf(node.handler.serializeConfig).toEqualTypeOf<
      INodeHandler<T>['serializeConfig']
    >()
    expectTypeOf(node.handler.serializeConfig).toEqualTypeOf<
      ((config: C) => SC)
    >()

    expectTypeOf(node.handler.deserializeConfig).toEqualTypeOf<
      INodeHandler<T>['deserializeConfig']
    >()
    expectTypeOf(node.handler.deserializeConfig).toEqualTypeOf<
      ((config: SC) => C)
    >()

    expectTypeOf(node.handler.loadConfig).toEqualTypeOf<
      INodeHandler<T>['loadConfig']
    >()
    expectTypeOf(node.handler.loadConfig).toEqualTypeOf<
      (config: RC, serializedConfig: SC) => void
    >()

    expectTypeOf(node.handler.validateInput).toEqualTypeOf<
      INodeHandler<T>['validateInput']
    >()
    expectTypeOf(node.handler.validateInput).toEqualTypeOf<
      ((inputData: T['Input'], typeFromPrevOutput: InputInstances, inputDataTypes: T['InputConstructors']) => NodeValidationError[])
    >()

    expectTypeOf(node.handler.inputDataTypes).toEqualTypeOf<INodeHandler<T>['inputDataTypes']>()
    expectTypeOf(node.handler.outputDataType).toEqualTypeOf<INodeHandler<T>['outputDataType']>()
  })
})