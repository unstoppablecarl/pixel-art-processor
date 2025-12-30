import { reactive, type Reactive, type WatchSource } from 'vue'
import type { StepDataType } from '../../steps.ts'
import { type Optional } from '../_helpers.ts'
import { InvalidInputTypeError, StepValidationError } from '../errors.ts'
import type { BaseDataStructure } from '../step-data-types/BaseDataStructure.ts'
import { PassThrough } from '../step-data-types/PassThrough.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import {
  type AnyStepContext,
  type ConfiguredStep,
  type ReactiveConfigType,
  type StepContext,
  type StepInputTypesToInstances,
} from './Step.ts'
import type { StepDataConfig } from './StepMeta.ts'
import { type StepRegistry, useStepRegistry } from './StepRegistry.ts'
import type { StepRunner } from './StepRunner.ts'

export type Config = Record<string, any>

export type WatcherTarget = WatchSource | Reactive<any>

export const INVALID_INPUT_TYPE = 'INVALID_INPUT_TYPE'

export type StepHandlerOptional =
  | 'watcher'
  | 'serializeConfig'
  | 'deserializeConfig'
  | 'config'
  | 'reactiveConfig'
  | 'loadConfig'
  | 'validateInput'

export type StepHandlerOptionsOmit =
  | 'setPassThroughDataType'
  | 'clearPassThroughDataType'

export type StepHandlerOptions<
  T extends AnyStepContext,
  R extends StepRunner<T> = StepRunner<T>
> = Omit<
  Optional<
    IStepHandler<T, R>, StepHandlerOptional
  >,
  | StepHandlerOptionsOmit
  | 'inputDataTypes'
  | 'outputDataType'
> & StepDataConfig<T['InputConstructors'], T['OutputConstructors']>

// ⚠️ property order matters here ⚠️
// anything that references SC must come after serializeConfig()
export type StepHandlerOptionsInfer<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly StepDataType[],
  O extends StepDataType,
  R extends StepRunner<StepContext<C, SC, RC, I, O>>,
> = {
  config?: () => C,
  reactiveConfig?: (defaults: C) => RC

  serializeConfig?: (config: C) => SC
  deserializeConfig?: (config: SC) => C

  loadConfig?: (config: RC, serialized: SC) => void

  watcher?: (step: ConfiguredStep<StepContext<C, SC, RC, I, O>, R>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]

  validateInput?: (
    inputData: StepInputTypesToInstances<I>,
    inputTypes: I,
  ) => StepValidationError[]

  run: R
} & ({
  passthrough?: false,
  inputDataTypes: I
  outputDataType: O
} | {
  passthrough: true,
  inputDataTypes?: undefined,
  outputDataType?: undefined,
})

export interface IStepHandler<
  T extends AnyStepContext,
  R extends StepRunner<T> = StepRunner<T>
> {
  inputDataTypes: T['InputConstructors'],
  outputDataType: T['OutputConstructors'],

  // fresh default config instance
  config(): T['C']

  // wraps default config in reactivity
  reactiveConfig(defaults: T['C']): T['RC'],

  // watch config and trigger updates
  watcher(step: ConfiguredStep<T, R>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[],

  // apply loaded config to internal reactive config
  loadConfig(config: T['RC'], serializedConfig: T['SerializedConfig']): void,

  // convert config to storage
  serializeConfig(config: T['C']): T['SerializedConfig'],

  // convert config from storage
  deserializeConfig(serializedConfig: T['SerializedConfig']): T['C'],

  validateInput(inputData: T['Input'], inputDataTypes: T['InputConstructors']): StepValidationError[],

  run: R,

  setPassThroughDataType: (passthroughType: StepDataType) => void,
  clearPassThroughDataType: () => void,
}

export function makeStepHandler<
  T extends AnyStepContext,
  R extends StepRunner<T> = StepRunner<T>
>(
  def: string,
  options: StepHandlerOptions<T, R>,
  stepRegistry: StepRegistry = useStepRegistry(),
): IStepHandler<T, R> {

  type RC = T['RC']
  type SerializedConfig = T['SerializedConfig']
  type C = T['C']
  type Input = T['Input']
  type InputConstructors = T['InputConstructors']

  stepRegistry.validateDefRegistration(def, options)

  const isPassthrough = options.passthrough
  const defaultInput = isPassthrough ? [PassThrough] : options.inputDataTypes
  const defaultOutput = isPassthrough ? PassThrough : options.outputDataType

  let passthroughType: StepDataType | undefined = undefined

  return {
    config(): C {
      return {}
    },
    reactiveConfig(defaults: C): RC {
      return reactive(defaults) as RC
    },
    watcher(_step: ConfiguredStep<T, R>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[] {
      return [
        ...defaultWatcherTargets,
      ]
    },
    deserializeConfig(serializedConfig: SerializedConfig): C {
      return {
        ...serializedConfig,
      } as C
    },
    serializeConfig(config: RC): SerializedConfig {
      const unwrapped = deepUnwrap(config)
      return {
        ...unwrapped,
      } as SerializedConfig
    },
    loadConfig(config: RC, serializedConfig: SerializedConfig): void {
      const deserialized = this.deserializeConfig(serializedConfig)
      Object.assign(config, deserialized)
    },
    validateInput(
      inputData: Input | null,
      inputDataTypes: InputConstructors,
    ): StepValidationError[] {
      if (inputData === null) return []

      if ((inputDataTypes as any[]).some(c => (inputData as any) instanceof c)) return []

      const receivedType = (inputData as BaseDataStructure).constructor as StepDataType
      return [
        new InvalidInputTypeError(inputDataTypes, receivedType),
      ]
    },

    // ⚠️make sure options is exactly here
    ...options,

    get inputDataTypes() {
      return passthroughType ? [passthroughType] : defaultInput
    },

    get outputDataType() {
      return passthroughType ?? defaultOutput
    },

    clearPassThroughDataType() {
      passthroughType = undefined
    },

    setPassThroughDataType(type: StepDataType) {
      passthroughType = type
    },
  } as IStepHandler<T, R>
}


