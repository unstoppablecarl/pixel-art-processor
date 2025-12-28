import { reactive, type Reactive, type WatchSource } from 'vue'
import type { StepDataType, StepDataTypeInstance } from '../../steps.ts'
import { type Optional } from '../_helpers.ts'
import { InvalidInputTypeError, StepValidationError } from '../errors.ts'
import { copyStepDataOrNull } from '../step-data-types/_step-data-type-helpers.ts'
import { type ConfigKeyAdapter, deserializeObjectKeys, serializeObjectKeys } from '../util/object-key-serialization.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import { type AnyStepContext } from './Step.ts'
import { stepOutputTypeCompatibleWithInputTypes, useStepRegistry } from './StepRegistry.ts'
import type { ConfiguredStep } from './useStepHandler.ts'

export type Config = Record<string, any>
declare const CONFIG_SERIALIZED: unique symbol

export type ConfigSerialized = Record<string, any> & { [CONFIG_SERIALIZED]: true }

export const INVALID_INPUT_TYPE = 'INVALID_INPUT_TYPE'

export type StepHandlerOptional =
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

export type StepHandlerOptions<T extends AnyStepContext, Runner> =
  Optional<Omit<IStepHandler<T, Runner>, 'run'>, StepHandlerOptional> & {
  run: Runner,
}

export type ConfigKeyAdapters<
  C extends Config = Config,
  SerializedConfig extends Config = C
> = Partial<{
  [K in keyof C & keyof SerializedConfig]: ConfigKeyAdapter<SerializedConfig[K], C[K]>
}>

export type WatcherTarget = WatchSource | Reactive<any>

export interface IStepHandler<T extends AnyStepContext, Runner> {
  inputDataTypes: T['InputConstructors'],
  outputDataType: T['OutputConstructors'],
  run: Runner,

  // getter for config
  config(): T['RC'],

  // watch config and trigger updates
  watcher(step: ConfiguredStep<T, Runner>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[],

  // apply loaded config to internal reactive config
  loadConfig(config: T['RC'], serializedConfig: T['SerializedConfig']): void,

  // convert config to storage
  serializeConfig(config: T['C']): T['SerializedConfig'],

  // convert config from storage
  deserializeConfig(serializedConfig: T['SerializedConfig']): T['C'],

  // prepare input data when changed
  prevOutputToInput(outputData: T['Input'] | null): T['Input'] | null,

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

export function makeStepHandler<
  T extends AnyStepContext,
  Runner
>(def: string, options: StepHandlerOptions<T, Runner>): IStepHandler<T, Runner> {

  type RC = T['RC']
  type SerializedConfig = T['SerializedConfig']
  type C = T['C']
  type Input = T['Input']
  type InputConstructors = T['InputConstructors']

  useStepRegistry().validateDefRegistration(def, options)

  const baseStepHandler = {
    inputDataTypes: options.inputDataTypes,
    outputDataType: options.outputDataType,
    configKeyAdapters: options.configKeyAdapters ?? undefined,

    config(): RC {
      return reactive({}) as RC
    },

    watcher(_step: ConfiguredStep<T, Runner>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[] {
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
      const unwrapped = deepUnwrap(config)
      return {
        ...unwrapped,
        ...this.serializeConfigKeys(unwrapped),
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
      if (stepOutputTypeCompatibleWithInputTypes(typeFromPrevOutput, inputDataTypes)) {
        return []
      }

      return [
        new InvalidInputTypeError(inputDataTypes, typeFromPrevOutput),
      ]
    },

    validateInput(_inputData: Input): StepValidationError[] {
      return []
    },
  }

  return {
    ...baseStepHandler,
    ...options,
  } as IStepHandler<T, Runner>
}

// export type ForkStepRunner<T extends AnyStepContext> = (
//   {
//     config,
//     inputData,
//     branchCount,
//   }: {
//     config: T['RC'],
//     inputData: T['Input'] | null,
//     branchCount: number,
//   }) => ForkStepRunnerOutput<T['Output']>
//   | Promise<ForkStepRunnerOutput<T['Output']>>

export type StepRunner<T extends AnyStepContext> = ({ config, inputData }: {
  config: T['RC'],
  inputData: T['Input'] | null,
}) => StepRunnerOutput<T['Output']>
  | Promise<StepRunnerOutput<T['Output']>>

export type StepRunnerOutput<Output> = null |
  undefined | {
  preview?: ImageData | null | undefined,
  output: Output | null | undefined,
  validationErrors?: StepValidationError[]
}

// export type ForkStepRunnerOutput<Output> = null | undefined | {
//   preview?: ImageData | ImageData[] | null | undefined,
//   branchesOutput: Output[] | null | undefined,
//   validationErrors?: StepValidationError[]
// }

// export function parseForkStepRunnerResult<T extends AnyStepContext>(result: ForkStepRunnerOutput<T['Output']>): {
//   preview: ImageData | ImageData[] | null,
//   validationErrors: StepValidationError[],
//   outputData: T['Output'][],
// } {
//   return {
//     outputData: result?.branchesOutput?.map(copyStepDataOrNull) ?? [],
//     preview: result?.preview ?? null,
//     validationErrors: result?.validationErrors ?? [],
//   }
// }

export function parseStepRunnerResult<Output extends StepDataTypeInstance>(
  result: StepRunnerOutput<Output>,
): {
  preview: ImageData | null,
  validationErrors: StepValidationError[],
  outputData: Output | null,
} {
  return {
    outputData: copyStepDataOrNull(result?.output ?? null) ?? null,
    preview: result?.preview ?? null,
    validationErrors: result?.validationErrors ?? [],
  }
}