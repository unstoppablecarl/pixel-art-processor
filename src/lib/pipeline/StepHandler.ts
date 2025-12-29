import { reactive, type Reactive, type WatchSource } from 'vue'
import type { StepDataType } from '../../steps.ts'
import { type Optional } from '../_helpers.ts'
import { InvalidInputTypeError, StepValidationError } from '../errors.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import {
  type AnyStepContext,
  type ReactiveConfigType,
  type StepContext,
  type StepInputTypesToInstances,
} from './Step.ts'
import { stepOutputTypeCompatibleWithInputTypes, type StepRegistry, useStepRegistry } from './StepRegistry.ts'
import type { StepRunner } from './StepRunner.ts'
import type { ConfiguredStep } from './useStepHandler.ts'

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
  | 'prevOutputToInput'
  | 'validateInputType'
  | 'validateInput'

export type StepHandlerOptions<
  T extends AnyStepContext,
  R extends StepRunner<T> = StepRunner<T>
> =
  Optional<IStepHandler<T, R>, StepHandlerOptional>

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
  inputDataTypes: I
  outputDataType: O

  config?: () => C,
  reactiveConfig?: (defaults: C) => RC

  serializeConfig?: (config: C) => SC
  deserializeConfig?: (config: SC) => C

  loadConfig?: (config: RC, serialized: SC) => void

  watcher?: (step: ConfiguredStep<StepContext<C, SC, RC, I, O>, R>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]

  prevOutputToInput?: (output: StepInputTypesToInstances<I> | null) => StepInputTypesToInstances<I> | null

  validateInputType?: (
    typeFromPrev: StepInputTypesToInstances<I>,
    inputTypes: I,
  ) => StepValidationError[]

  validateInput?: (inputData: StepInputTypesToInstances<I>) => StepValidationError[]

  run: R
}

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

  // prepare input data when changed
  prevOutputToInput(outputData: T['Input'] | null): T['Input'] | null,

  // validate the prevStep.outputDataType against currentStep.inputDataType
  validateInputType(typeFromPrevOutput: T['Input'], inputDataTypes: T['InputConstructors']): StepValidationError[],

  // further validate input after determining it is the correct type
  validateInput(inputData: T['Input']): StepValidationError[],

  run: R,
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

  const baseStepHandler: Omit<IStepHandler<T, R>, 'run'> = {
    inputDataTypes: options.inputDataTypes,
    outputDataType: options.outputDataType,

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

    prevOutputToInput(outputData: Input): Input {
      return outputData
    },

    validateInputType(typeFromPrevOutput: InputConstructors, inputDataTypes: InputConstructors): StepValidationError[] {
      if (stepOutputTypeCompatibleWithInputTypes(typeFromPrevOutput, inputDataTypes)) {
        return []
      }

      return [
        new InvalidInputTypeError(inputDataTypes, typeFromPrevOutput),
      ]
    },

    validateInput(_inputData: StepDataType): StepValidationError[] {
      return []
    },
  }

  return {
    ...baseStepHandler,
    ...options,
  } as IStepHandler<T, R>
}

