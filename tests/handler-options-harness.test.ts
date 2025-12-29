import { expectTypeOf } from 'vitest'
import { Reactive, reactive, type ShallowReactive, shallowReactive } from 'vue'
import { deepUnwrap } from '../src/lib/util/vue-util.ts'

class TypeA {
}

class TypeB {
}

class TypeC {
}

type StepDataType =
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

type StepValidationError = {}

type ConfiguredStep<T extends AnyStepContext> =
  Required<Omit<Step<T>, 'config' | 'handler'>>
  & {
  config: NonNullable<Step<T>['config']>,
  handler: NonNullable<Step<T>['handler']>,
}

type WatcherTarget = {}
type StepRunner<T extends AnyStepContext> = ({ config, inputData }: {
  config: T['RC'],
  inputData: T['Input'] | null,
}) => StepRunnerOutputMaybePromise<T['Output']>

export type StepRunnerOutputMaybePromise<Output> =
  | StepRunnerOutput<Output>
  | Promise<StepRunnerOutput<Output>>

type StepRunnerOutput<Output> = null |
  undefined | {
  output: Output | null | undefined,
}

type Config = Record<string, any>

type Step<T extends AnyStepContext> = {
  readonly id: string,
  readonly def: string,
  inputData: T['Input'] extends null ? null : T['Input'] | null,
  outputData: T['Output'] | T['Output'][] | null,
  config: T['RC'] | undefined,
  handler: IStepHandler<T> | undefined,
}

interface IStepHandler<T extends AnyStepContext> {
  inputDataTypes: T['InputConstructors'],
  outputDataType: T['OutputConstructors'],

  // fresh default config instance
  config(): T['C']

  // wraps default config in reactivity
  reactiveConfig(defaults: T['C']): T['RC'],

  // watch config and trigger updates
  watcher(step: ConfiguredStep<T>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[],

  // apply loaded config to internal reactive config
  loadConfig(config: T['RC'], serializedConfig: T['SerializedConfig']): void,

  // convert config to storage
  serializeConfig(config: T['C']): T['SerializedConfig'],

  // convert config from storage
  deserializeConfig(serializedConfig: T['SerializedConfig']): T['C'],

  // prepare input data when changed
  prevOutputToInput(outputData: T['Input'] | null): T['Input'] | null,

  // validate the prevStep.outputDataType against currentStep.inputDataType
  validateInputType(typeFromPrevOutput: T['Input'], inputDataTypes: T['InputConstructors']): StepValidationError[],

  // further validate input after determining it is the correct type
  validateInput(inputData: T['Input']): StepValidationError[],

  run: StepRunner<T>,
}

type StepInputTypesToInstances<Input extends readonly StepDataType[] = readonly StepDataType[]> = Input extends readonly []
  // first steps do not have input so convert [] to null
  ? null
  : Input[number] extends StepDataType
    // convert array of constructors to union of instances
    ? InstanceType<Input[number]>
    : never

type ReactiveConfigType<C extends Config> = ShallowReactive<C> | Reactive<C>;

type AnyStepContext = StepContext<any, any, any, any, any>

// Strict version for this harness (no defaults)
type StepContext<
  C extends Config,
  SerializedConfig extends Config,
  RC extends ReactiveConfigType<C>,
  Input extends readonly StepDataType[],
  Output extends StepDataType,
> = {
  C: C,
  OutputConstructors: Output,
  Output: InstanceType<Output>,
  InputConstructors: Input,
  Input: StepInputTypesToInstances<Input>,
  RC: RC,
  SerializedConfig: SerializedConfig,
}

type StepHandlerOptions<T extends AnyStepContext> = {
  inputDataTypes: T['InputConstructors']
  outputDataType: T['OutputConstructors']

  config: () => T['C']
  reactiveConfig: (defaults: T['C']) => T['RC']

  serializeConfig: (config: T['C']) => T['SerializedConfig']
  deserializeConfig: (config: T['SerializedConfig']) => T['C']

  watcher: (
    step: ConfiguredStep<T>,
  ) => void

  loadConfig: (config: T['RC'], serialized: T['SerializedConfig']) => void

  prevOutputToInput: (
    output: T['Input'] | null,
  ) => T['Input'] | null

  validateInputType: (
    typeFromPrev: T['Input'],
    inputTypes: T['InputConstructors'],
  ) => StepValidationError[],

  validateInput(inputData: T['Input']): StepValidationError[],

  run: StepRunner<T>
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

type StepHandlerOptionsInfer<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly StepDataType[],
  O extends StepDataType,
> = {
  inputDataTypes: I
  outputDataType: O

  config: () => C,

  reactiveConfig: (defaults: C) => RC

  serializeConfig: (config: C) => SC
  deserializeConfig: (config: SC) => C

  watcher: (step: ConfiguredStep<StepContext<C, SC, RC, I, O>>) => WatcherTarget[]
  loadConfig: (config: RC, serialized: SC) => void

  prevOutputToInput: (output: StepInputTypesToInstances<I> | null) => StepInputTypesToInstances<I> | null

  validateInputType: (
    typeFromPrev: StepInputTypesToInstances<I>,
    inputTypes: I,
  ) => StepValidationError[]

  validateInput: (inputData: StepInputTypesToInstances<I>) => StepValidationError[]

  run: StepRunner<StepContext<C, SC, RC, I, O>>
}

type T = StepContext<C, SC, RC, I, O>
type Options = StepHandlerOptions<T>

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type StepHandlerOptional =
  | 'watcher'
  | 'serializeConfig'
  | 'deserializeConfig'
  | 'config'
  | 'reactiveConfig'
  | 'loadConfig'
  | 'prevOutputToInput'
  | 'validateInputType'
  | 'validateInput'

type StepHandlerOptionsOptional<T extends AnyStepContext> =
  Optional<IStepHandler<T>, StepHandlerOptional>

function makeStepHandler<T extends AnyStepContext>(
  def: string,
  options: StepHandlerOptionsOptional<T>,
): IStepHandler<T> {

  const base: Omit<IStepHandler<T>, 'run'> = {
    inputDataTypes: options.inputDataTypes,
    outputDataType: options.outputDataType,

    config() {
      return {} as T['C']
    },

    reactiveConfig(defaults) {
      return reactive(defaults) as T['RC']
    },

    watcher(step: ConfiguredStep<T>, defaultWatcherTargets: WatcherTarget[]) {
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

    prevOutputToInput(outputData: T['Input'] | null): T['Input'] | null {
      return outputData
    },

    validateInputType(
      typeFromPrevOutput: StepDataType,
      inputDataTypes: T['InputConstructors'],
    ): StepValidationError[] {
      return []
    },

    validateInput(_inputData: T['Input']): StepValidationError[] {
      return []
    },
  }

  // Merge in any optional overrides from options
  return {
    ...base,
    ...options,
  } as IStepHandler<T>
}

function registerStep<T extends AnyStepContext>(
  stepId: string,
  handlerOptions: StepHandlerOptionsOptional<T>,
): {
  step: Step<T>,
  handler: IStepHandler<T>
} {
  const step = {} as ConfiguredStep<T>

  const handler = makeStepHandler<T>('test', handlerOptions)
  step.handler = handler

  return {
    step,
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

      watcher(step) {
        expectTypeOf(step).toExtend<ConfiguredStep<T>>()
        expectTypeOf(step.config).toExtend<ConfiguredStep<T>['config']>()

        return [] as WatcherTarget[]
      },
      loadConfig(config, serialized) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(serialized).toExtend<SC>()
      },
      prevOutputToInput(output) {
        expectTypeOf(output).toEqualTypeOf<InputInstances | null>()

        return output as InputInstances | null
      },
      validateInputType() {
        return [] as StepValidationError[]
      },
      validateInput(inputData) {
        expectTypeOf(inputData).toEqualTypeOf<InputInstances>()

        return [] as StepValidationError[]
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
      I extends readonly StepDataType[],
      O extends StepDataType,
    >(
      options: StepHandlerOptions<StepContext<C, SC, RC, I, O>>,
      _configExample: C,
      _serializedConfigExample: SC,
      _inputExample: I,
      _outputExample: O,
    ) {
      type T = StepContext<C, SC, RC, I, O>

      expectTypeOf(options).toExtend<StepHandlerOptions<T>>()

      expectTypeOf<StepHandlerOptions<T>['serializeConfig']>()
        .toEqualTypeOf<(config: C) => SC>()
      expectTypeOf<StepHandlerOptions<T>['deserializeConfig']>()
        .toEqualTypeOf<(config: SC) => C>()

      expectTypeOf<StepHandlerOptions<T>['run']>()
        .toEqualTypeOf<StepRunner<T>>()
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

        watcher(step) {
          return []
        },
        loadConfig(config, serialized) {
        },
        prevOutputToInput(output) {
          return output
        },
        validateInput(inputData) {
          return []
        },

        validateInputType() {
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
      I extends readonly StepDataType[],
      O extends StepDataType,
    >(
      options: StepHandlerOptions<StepContext<C, SC, RC, I, O>>,
      _configExample: C,
      _serializedConfigExample: SC,
      _inputExample: I,
      _outputExample: O,
    ) {
      type T = StepContext<C, SC, RC, I, O>

      // 1) Core identity: the options *are* handler options for T
      expectTypeOf(options).toExtend<StepHandlerOptions<T>>()

      // 3) Config relationships
      expectTypeOf<StepHandlerOptions<T>['serializeConfig']>()
        .toEqualTypeOf<(config: C) => SC>()
      expectTypeOf<StepHandlerOptions<T>['deserializeConfig']>()
        .toEqualTypeOf<(config: SC) => C>()

      // 4) Run signature
      expectTypeOf<StepHandlerOptions<T>['run']>()
        .toEqualTypeOf<StepRunner<T>>()
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

        watcher(step) {
          return []
        },
        loadConfig(config, serialized) {
        },
        prevOutputToInput(output) {
          return output
        },
        validateInput(inputData) {
          return []
        },

        validateInputType() {
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

  // it('makeStepHandler with 2 input types', async () => {
  //
  //   const handler = makeStepHandler<T>('foo', {
  //     inputDataTypes,
  //     outputDataType,
  //     config(): RC {
  //       return shallowReactive(configRaw)
  //     },
  //
  //     serializeConfig(config): SC {
  //       expectTypeOf(config).toEqualTypeOf<C>()
  //
  //       return {
  //         maskImageData: serializeImageData(config.maskImageData),
  //       }
  //     },
  //
  //     deserializeConfig(config): C {
  //       expectTypeOf(config).toEqualTypeOf<SC>()
  //
  //       return {
  //         maskImageData: deserializeImageData(config.maskImageData),
  //       }
  //     },
  //
  //     watcher(step): WatcherTarget[] {
  //       expectTypeOf(step).toEqualTypeOf<ConfiguredStep<T>>()
  //       return []
  //     },
  //     loadConfig(config, serialized): void {
  //       expectTypeOf(config).toEqualTypeOf<RC>()
  //       expectTypeOf(serialized).toEqualTypeOf<SC>()
  //     },
  //     prevOutputToInput(output): TypeA | TypeB | null {
  //       expectTypeOf(output).toEqualTypeOf<TypeA | TypeB | null>()
  //       return output
  //     },
  //     validateInputType() {
  //       return []
  //     },
  //     validateInput(inputData): StepValidationError[] {
  //       expectTypeOf(inputData).toEqualTypeOf<TypeA | TypeB>()
  //
  //       return []
  //     },
  //     run({ config, inputData }) {
  //       expectTypeOf(config).toEqualTypeOf<RC>()
  //       expectTypeOf(inputData).toEqualTypeOf<TypeA | TypeB | null>()
  //
  //       return { output: new TypeC() }
  //     },
  //   })
  //
  //   expectTypeOf(handler).toEqualTypeOf<IStepHandler<T>>()
  // })

  it('registerStep', async () => {
    const { step, handler } = registerStep<T>('foo', {
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

      watcher(step): WatcherTarget[] {
        expectTypeOf(step).toEqualTypeOf<ConfiguredStep<T>>()
        return []
      },
      loadConfig(config, serialized): void {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(serialized).toEqualTypeOf<SC>()
      },
      prevOutputToInput(output): TypeA | TypeB | null {
        expectTypeOf(output).toEqualTypeOf<TypeA | TypeB | null>()
        return output
      },
      validateInputType() {
        return []
      },
      validateInput(inputData): StepValidationError[] {
        expectTypeOf(inputData).toEqualTypeOf<TypeA | TypeB>()

        return []
      },
      run({ config, inputData }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(inputData).toEqualTypeOf<TypeA | TypeB | null>()

        return { output: new TypeC() }
      },
    })

    expectTypeOf(handler).toEqualTypeOf<IStepHandler<T>>()
    expectTypeOf(step).toEqualTypeOf<Step<T>>()
  })

  it('generic handler', () => {
    function useGenericHandler<
      C extends Config,
      SC extends Config,
      RC extends ReactiveConfigType<C>,
      I extends readonly StepDataType[],
      O extends StepDataType,
    >(
      stepId: string,
      options: StepHandlerOptionsInfer<C, SC, RC, I, O>,
    ) {
      return {} as ConfiguredStep<StepContext<C, SC, RC, I, O>>
    }

    const step = useGenericHandler('testing', {
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

      watcher(step) {
        return []
      },
      loadConfig(config, serialized) {
      },
      prevOutputToInput(output) {
        return output
      },
      validateInputType() {
        return []
      },
      validateInput(inputData) {
        return []
      },
      run({ config, inputData }) {
        return { output: new TypeC() }
      },
    })

    expectTypeOf(step).toExtend<ConfiguredStep<StepContext<C, SC, RC, I, O>>>()
  })

  it('realistic handler', () => {

    function useTestHandler<
      C extends Config,
      SC extends Config,
      RC extends ReactiveConfigType<C>,
      I extends readonly StepDataType[],
      O extends StepDataType,
    >(
      stepId: string,
      options: StepHandlerOptionsInfer<C, SC, RC, I, O>,
    ) {

      type T = StepContext<C, SC, RC, I, O>
      const { step, handler } = registerStep<T>(stepId, options)

      expectTypeOf(handler).toEqualTypeOf<IStepHandler<T>>()

      return step as ConfiguredStep<T>
    }

    const step = useTestHandler('testing', {
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
        expectTypeOf(config).toEqualTypeOf<SC>()
        return {
          maskImageData: deserializeImageData(config.maskImageData),
        } as C
      },

      watcher(step) {
        expectTypeOf(step).toExtend<ConfiguredStep<T>>()
        expectTypeOf(step.config).toExtend<ConfiguredStep<T>['config']>()

        return [] as WatcherTarget[]
      },
      loadConfig(config, serialized) {
        expectTypeOf(config).toExtend<RC>()
        expectTypeOf(serialized).toExtend<SC>()
      },
      prevOutputToInput(output) {
        expectTypeOf(output).toEqualTypeOf<InputInstances | null>()

        return output as InputInstances | null
      },
      validateInputType() {
        return [] as StepValidationError[]
      },
      validateInput(inputData) {
        expectTypeOf(inputData).toEqualTypeOf<InputInstances>()

        return [] as StepValidationError[]
      },
      run({ config, inputData }) {
        expectTypeOf(config).toEqualTypeOf<RC>()
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()

        return { output: new TypeC() }
      },
    })

    // should work with the prev declared T as well
    type T = typeof step extends ConfiguredStep<infer U> ? U : never

    expectTypeOf<T>().toEqualTypeOf<StepContext<C, SC, RC, I, O>>()
    expectTypeOf(step).not.toEqualTypeOf<ConfiguredStep<AnyStepContext>>()
    expectTypeOf(step).toExtend<ConfiguredStep<StepContext<C, SC, RC, I, O>>>()

    expectTypeOf(step.handler.run).toEqualTypeOf<
      IStepHandler<T>['run']
    >()
    expectTypeOf(step.handler.run).toEqualTypeOf<
      StepRunner<T>
    >()
    expectTypeOf(step.handler.run).toEqualTypeOf<
      ({ config, inputData }: {
        config: RC,
        inputData: InputInstances | null
      }) => StepRunnerOutputMaybePromise<OutputInstance>
    >()
    expectTypeOf(step.handler.run).parameters.toEqualTypeOf<[
      { config: RC, inputData: InputInstances | null }
    ]>()
    expectTypeOf(step.handler.run).returns.toEqualTypeOf<
      StepRunnerOutputMaybePromise<OutputInstance>
    >()

    expectTypeOf(step.handler.config).toEqualTypeOf<
      IStepHandler<T>['config']
    >()
    expectTypeOf(step.handler.config).toEqualTypeOf<
      () => C
    >()

    expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
      IStepHandler<T>['reactiveConfig']
    >()
    expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
      (defaults: C) => RC
    >()

    expectTypeOf(step.handler.watcher).toEqualTypeOf<
      IStepHandler<T>['watcher']
    >()
    expectTypeOf(step.handler.watcher).toEqualTypeOf<
      (step: ConfiguredStep<T>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]
    >()

    expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
      IStepHandler<T>['serializeConfig']
    >()
    expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
      ((config: C) => SC)
    >()

    expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
      IStepHandler<T>['deserializeConfig']
    >()
    expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
      ((config: SC) => C)
    >()

    expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
      IStepHandler<T>['loadConfig']
    >()
    expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
      (config: RC, serializedConfig: SC) => void
    >()

    expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<
      IStepHandler<T>['prevOutputToInput']
    >()
    expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<
      ((output: InputInstances | null) => InputInstances | null)
    >()

    expectTypeOf(step.handler.validateInputType).toEqualTypeOf<
      IStepHandler<T>['validateInputType']
    >()
    expectTypeOf(step.handler.validateInputType).toEqualTypeOf<
      ((typeFromPrevOutput: InputInstances, inputDataTypes: T['InputConstructors']) => StepValidationError[])
    >()

    expectTypeOf(step.handler.validateInput).toEqualTypeOf<
      IStepHandler<T>['validateInput']
    >()
    expectTypeOf(step.handler.validateInput).toEqualTypeOf<
      (inputData: InputInstances) => StepValidationError[]
    >()
  })
})