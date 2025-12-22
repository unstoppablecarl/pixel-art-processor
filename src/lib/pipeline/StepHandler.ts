import { reactive, type Reactive, type WatchSource } from 'vue'
import type { StepDataType, StepDataTypeInstance } from '../../steps.ts'
import { type Optional } from '../_helpers.ts'
import { InvalidInputTypeError, StepValidationError } from '../errors.ts'
import { type ConfigKeyAdapter, deserializeObjectKeys, serializeObjectKeys } from '../util/object-key-serialization.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import { type AnyStepContext, type ReactiveConfigType, type Step, STEP_FORK_DEF, StepType } from './Step.ts'
import { useStepRegistry } from './StepRegistry.ts'
import type { ConfiguredStep } from './useStepHandler.ts'

export type Config = Record<string, any>

export const INVALID_INPUT_TYPE = 'INVALID_INPUT_TYPE'

type StepHandlerOptional =
  'watcher'
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

export type StepHandlerOptions<T extends AnyStepContext> = Optional<IStepHandler<T>, StepHandlerOptional>

export type ConfigKeyAdapters<
  C extends Config = Config,
  SerializedConfig extends Config = C
> = Partial<{
  [K in keyof C & keyof SerializedConfig]: ConfigKeyAdapter<SerializedConfig[K], C[K]>
}>

type WatcherTarget = WatchSource | Reactive<any>

export interface IStepHandler<T extends AnyStepContext> {
  inputDataTypes: T['InputConstructors'],
  outputDataType: T['OutputConstructors'],
  run: StepRunner<T>,

  // getter for config
  config(): T['RC'],

  // watch config and trigger updates
  watcher(step: ConfiguredStep<T>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[],

  // apply loaded config to internal reactive config
  loadConfig(config: T['RC'], serializedConfig: T['SerializedConfig']): void,

  // convert config to storage
  serializeConfig(config: T['C']): T['SerializedConfig'],

  // convert config from storage
  deserializeConfig(serializedConfig: T['SerializedConfig']): T['C'],

  // prepare input data when changed
  prevOutputToInput(outputData: StepDataTypeInstance | null): T['Input'] | null,

  // validate the prevStep.outputDataType against currentStep.inputDataType
  validateInputType(typeFromPrevOutput: StepDataType, inputDataTypes: T['InputConstructors']): StepValidationError[],

  // further validate input after determining it is the correct type
  validateInput(inputData: T['Input']): StepValidationError[],

  deserializeConfigKeys(
    serializedConfig: Record<string, any>,
  ): Record<string, any>

  serializeConfigKeys(
    config: T['RC'],
  ): Record<string, any>

  configKeyAdapters?: ConfigKeyAdapters<T['C'], T['SerializedConfig']>,
}

export function makeStepHandler<T extends AnyStepContext>(def: string, options: StepHandlerOptions<T>) {

  type RC = T['RC']
  type SerializedConfig = T['SerializedConfig']
  type C = T['C']
  type Input = T['Input']
  type InputConstructors = T['InputConstructors']

  validateInputDataTypes(def, options.inputDataTypes)
  validateOutputDataTypes(def, options.outputDataType)

  if (def === STEP_FORK_DEF) {

  }

  const baseStepHandler = {
    inputDataTypes: options.inputDataTypes,
    outputDataType: options.outputDataType,
    configKeyAdapters: options.configKeyAdapters ?? undefined,

    config(): RC {
      return reactive({}) as RC
    },

    watcher(_step: ConfiguredStep<T>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[] {
      return [
        ...defaultWatcherTargets,
      ]
    },

    deserializeConfigKeys(
      serializedConfig: SerializedConfig,
    ): C {
      if (!this.configKeyAdapters) return {} as C
      return deserializeObjectKeys<C, SerializedConfig>(this.configKeyAdapters, serializedConfig)
    },

    serializeConfigKeys(
      config: RC,
    ): Record<string, any> {
      if (!this.configKeyAdapters) return {}
      return serializeObjectKeys(this.configKeyAdapters, config)
    },

    deserializeConfig(serializedConfig: SerializedConfig): C {
      return {
        ...serializedConfig,
        ...this.deserializeConfigKeys(serializedConfig),
      } as C
    },

    serializeConfig(config: RC): SerializedConfig {
      return {
        ...config,
        ...this.serializeConfigKeys(deepUnwrap(config)),
      } as SerializedConfig
    },

    loadConfig(config: RC, serializedConfig: SerializedConfig): void {
      const deserialized = this.deserializeConfig(serializedConfig)
      Object.assign(config, deserialized)
    },

    prevOutputToInput(outputData: StepDataTypeInstance): Input {
      // pass through by default
      return outputData as unknown as Input
    },

    validateInputType(typeFromPrevOutput: StepDataType, inputDataTypes: InputConstructors): StepValidationError[] {
      if (inputDataTypes.includes(typeFromPrevOutput)) {
        return []
      }

      return [
        new InvalidInputTypeError(inputDataTypes, typeFromPrevOutput),
      ]
    },

    validateInput(_inputData: Input): StepValidationError[] {
      return []
    },

    run(_config: RC, _inputData: ImageData | null): StepRunnerOutput<T> {
      throw new Error('Step handler must implement the run() method')
    },
  } as IStepHandler<T>

  return {
    ...baseStepHandler,
    ...options,
  } as IStepHandler<T>
}

export type StepRunner<T extends AnyStepContext> = StepRunnerRaw<T['RC'], T['Input'], T['Output']>

export type StepRunnerOptions<
  C extends Config,
  RC extends ReactiveConfigType<C>,
  Input extends readonly StepDataType[],
  Output extends StepDataType,
> = StepRunnerRaw<
  RC,
  InstanceType<Input[number]>,
  InstanceType<Output>
>

export type StepRunnerRaw<
  RC,
  Input extends StepDataTypeInstance,
  Output extends StepDataTypeInstance
> = ({ config, inputData }: {
  config: RC,
  inputData: Input | null
}) => StepRunnerOutput<Output>

export type StepRunnerOutput<Output> = null |
  undefined | {
  preview: ImageData | null | undefined,
  output: Output | null | undefined,
  validationErrors?: StepValidationError[]
}

export function parseStepRunnerResult<T extends AnyStepContext>(step: Step<T>, result: StepRunnerOutput<T>): {
  outputData: T['Output'] | null,
  preview: ImageData | null,
  validationErrors: StepValidationError[],
} {

  if (step.type === StepType.FORK) {
    return {
      outputData: step.inputData,
      preview: null,
      validationErrors: [],
    }
  }

  const isEmpty = result === null || result === undefined
  if (isEmpty) {
    return {
      outputData: null,
      preview: null,
      validationErrors: [],
    }
  }

  return {
    outputData: result.output ?? null,
    preview: result?.preview ?? null,
    validationErrors: result.validationErrors ?? [],
  }
}

function validateInputDataTypes(def: string, inputDataTypes: any[]) {
  const dataTypeRegistry = useStepRegistry().dataTypeRegistry
  const invalid = inputDataTypes.filter(t => !dataTypeRegistry.isValidType(t))
  if (invalid.length) {
    const message = `Step "${def}" has invalid Input Data Type(s). Step Data Types must be registered in main.ts with installStepRegistry() `
    console.error(message, invalid)
    throw new Error(message)
  }
}

function validateOutputDataTypes(def: string, outputDataType: any) {
  const dataTypeRegistry = useStepRegistry().dataTypeRegistry
  if (!dataTypeRegistry.isValidType(outputDataType)) {
    const message = `Step "${def}" has an invalid Output Data Type. Step Data Types must be registered in main.ts with installStepRegistry() `
    console.error(message, outputDataType)
    throw new Error(message)
  }
}