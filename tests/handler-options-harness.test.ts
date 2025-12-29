import { expectTypeOf } from 'vitest'
import { Reactive, shallowReactive, type ShallowReactive } from 'vue'

class TypeA {
}

class TypeB {
}

class TypeC {
}

export type StepDataType =
  | typeof TypeA
  | typeof TypeB
  | typeof TypeC

export type SerializedImageData = {
  width: number,
  height: number,
  data: number[],
}

export function deserializeImageData(obj: SerializedImageData | null): ImageData | null {
  if (obj === null) return null

  return new ImageData(
    new Uint8ClampedArray(obj.data),
    obj.width,
    obj.height,
  )
}

export function serializeImageData(imageData: ImageData | null): SerializedImageData | null {
  if (imageData === null) return null

  return {
    width: imageData.width,
    height: imageData.height,
    data: Array.from(imageData.data),
  }
}

type StepValidationError = {}

export type ConfiguredStep<T extends AnyStepContext> =
  Required<Omit<Step<T>, 'config' | 'handler'>>
  & {
  config: NonNullable<Step<T>['config']>,
  handler: NonNullable<Step<T>['handler']>,
}

type WatcherTarget = {}
export type StepRunner<T extends AnyStepContext> = ({ config, inputData }: {
  config: T['RC'],
  inputData: T['Input'] | null,
}) => StepRunnerOutput<T['Output']>
  | Promise<StepRunnerOutput<T['Output']>>

export type StepRunnerOutput<Output> = null |
  undefined | {
  output: Output | null | undefined,
}

export type Config = Record<string, any>

export type Step<T extends AnyStepContext> = {
  readonly id: string,
  readonly def: string,
  inputData: T['Input'] extends null ? null : T['Input'] | null,
  outputData: T['Output'] | T['Output'][] | null,
  config: T['RC'] | undefined,
  handler: IStepHandler<T> | undefined,
}

export interface IStepHandler<T extends AnyStepContext> {
  inputDataTypes: T['InputConstructors'],
  outputDataType: T['OutputConstructors'],

  // getter for config
  config(): T['RC'],
  watcher(step: ConfiguredStep<T>, defaultWatcherTargets: WatcherTarget[]):  WatcherTarget[],
  loadConfig(config: T['RC'], serializedConfig: T['SerializedConfig']): void,
  serializeConfig(config: T['C']): T['SerializedConfig'],
  deserializeConfig(serializedConfig: T['SerializedConfig']): T['C'],
  prevOutputToInput(outputData: T['Input'] | null): T['Input'] | null,
  validateInputType(typeFromPrevOutput: T['Input'], inputDataTypes: T['InputConstructors']): StepValidationError[],
  validateInput(inputData: T['Input']): StepValidationError[],

  run: StepRunner<T>,
}

export type StepInputTypesToInstances<Input extends readonly StepDataType[] = readonly StepDataType[]> = Input extends readonly []
  // first steps do not have input so convert [] to null
  ? null
  : Input[number] extends StepDataType
    // convert array of constructors to union of instances
    ? InstanceType<Input[number]>
    : never

export type ReactiveConfigType<C extends Config> = ShallowReactive<C> | Reactive<C>;

export type AnyStepContext = StepContext<any, any, any, any, any>

// Strict version for this harness (no defaults)
export type StepContext<
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

// THIS ALSO WORKS!
type StepHandlerOptions<T extends AnyStepContext> = IStepHandler<T>

// type StepHandlerOptions<T extends AnyStepContext> = {
//   inputDataTypes: T['InputConstructors']
//   outputDataType: T['OutputConstructors']
//
//   config: () => T['RC']
//
//   serializeConfig: (config: T['C']) => T['SerializedConfig']
//   deserializeConfig: (config: T['SerializedConfig']) => T['C']
//
//   watcher: (
//     step: ConfiguredStep<T>,
//   ) => void
//
//   loadConfig: (config: T['RC'], serialized: T['SerializedConfig']) => void
//
//   prevOutputToInput: (
//     output: T['Input'] | null,
//   ) => T['Input'] | null
//
//   validateInputType: (
//     typeFromPrev: T['Input'],
//     inputTypes: T['InputConstructors'],
//   ) => StepValidationError[],
//
//   validateInput(inputData: T['Input']): StepValidationError[],
//
//   run: StepRunner<T>
// }

// --- 2. useGenericHandler rewritten to expose TInferred -----------------------

function useGenericHandler<
  T extends AnyStepContext
>(
  stepId: string,
  options: StepHandlerOptions<T>,
) {
  return {} as ConfiguredStep<T>
}

// --- 3. Concrete expected types ----------------------------------------------

const inputDataTypes = [TypeB, TypeA] as const
const outputDataType = TypeC

const configRaw = {
  maskImageData: null as ImageData | null,
} satisfies Config

type C = typeof configRaw
type SC = { maskImageData: SerializedImageData | null }
type RC = ShallowReactive<C>
type I = typeof inputDataTypes
type O = typeof outputDataType

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

  // 2) Input/output constructors

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
      return shallowReactive(configRaw)
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

const step = useGenericHandler('testing', {
  inputDataTypes,
  outputDataType,

  config() {
    return shallowReactive(configRaw)
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

type T = StepContext<C, SC, RC, I, O>
type Options = StepHandlerOptions<T>

const handlerOptions: Options = {
  inputDataTypes,
  outputDataType,

  config() {
    return shallowReactive(configRaw)
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
}
expectTypeOf<typeof handlerOptions>().toEqualTypeOf<Options>()
expectTypeOf<typeof handlerOptions.inputDataTypes>().toEqualTypeOf<I>()
expectTypeOf<typeof handlerOptions.outputDataType>().toEqualTypeOf<O>()

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type StepHandlerOptional =
  | 'watcher'
  | 'serializeConfig'
  | 'deserializeConfig'
  | 'config'
  | 'loadConfig'
  | 'prevOutputToInput'
  | 'validateInputType'
  | 'validateInput'

export type StepHandlerOptionsOptional<T extends AnyStepContext> =
  Optional<IStepHandler<T>, StepHandlerOptional>

type T2 = StepContext<C, SC, RC, I, O>
type Options2 = StepHandlerOptionsOptional<T2>

const minimalOptions: Options2 = {
  inputDataTypes,
  outputDataType,
  run({ config, inputData }) {
    return { output: new TypeC() }
  },
}

const fullOptions: Options = {
  inputDataTypes,
  outputDataType,

  config() {
    return shallowReactive(configRaw)
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
}

expectTypeOf(fullOptions).toExtend<Options2>()
expectTypeOf(minimalOptions).toExtend<Options2>()
expectTypeOf<Options2['serializeConfig']>()
  .toEqualTypeOf<((config: C) => SC) | undefined>()

expectTypeOf<Options2['deserializeConfig']>()
  .toEqualTypeOf<((config: SC) => C) | undefined>()

expectTypeOf<Options2['prevOutputToInput']>()
  .toEqualTypeOf<((output: T2['Input'] | null) => T2['Input'] | null) | undefined>()

expectTypeOf<Options2['validateInputType']>()
  .toExtend<((typeFromPrevOutput: T2["Input"], inputDataTypes: T2["InputConstructors"]) => StepValidationError[]) | undefined>()

