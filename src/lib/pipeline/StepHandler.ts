import { reactive, shallowRef } from 'vue'
import { type Optional } from '../_helpers.ts'
import { InvalidInputTypeError } from '../errors/InvalidInputTypeError.ts'
import { StepValidationError } from '../errors/StepValidationError.ts'
import type { BaseDataStructure } from '../step-data-types/BaseDataStructure.ts'
import { PassThrough } from '../step-data-types/PassThrough.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import type { Config, StepDataConfig, StepDataType, WatcherTarget } from './_types.ts'
import type { InitializedNode } from './Node.ts'
import type { NodeRunner } from './NodeRunner.ts'
import {
  type AnyStepContext,
  type ReactiveConfigType,
  type StepContext,
  type StepInputTypesToInstances,
} from './Step.ts'
import { type StepRegistry, useStepRegistry } from './StepRegistry.ts'

export type StepHandlerOptional =
  | 'watcherTargets'
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
  R extends NodeRunner<T> = NodeRunner<T>
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
  R extends NodeRunner<StepContext<C, SC, RC, I, O>>,
> = {
  config?: () => C,
  reactiveConfig?: (defaults: C) => RC

  serializeConfig?: (config: C) => SC
  deserializeConfig?: (config: SC) => C

  loadConfig?: (config: RC, serialized: SC) => void

  watcher?: (step: InitializedNode<StepContext<C, SC, RC, I, O>>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]

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
  R extends NodeRunner<T> = NodeRunner<T>> {
  inputDataTypes: T['InputConstructors'],
  outputDataType: T['OutputConstructors'],

  // fresh default config instance
  config(): T['C']

  // wraps default config in reactivity
  reactiveConfig(defaults: T['C']): T['RC'],

  // watch config and trigger updates
  watcherTargets(): WatcherTarget[],

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
  R extends NodeRunner<T> = NodeRunner<T>
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

  const passthroughType = shallowRef<StepDataType | undefined>(undefined)

  return {
    config(): C {
      return {}
    },
    reactiveConfig(defaults: C): RC {
      return reactive(defaults) as RC
    },
    watcherTargets(): WatcherTarget[] {
      return []
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
      return passthroughType.value ? [passthroughType.value] : defaultInput
    },

    get outputDataType() {
      return passthroughType.value ?? defaultOutput
    },

    clearPassThroughDataType() {
      passthroughType.value = undefined
    },

    setPassThroughDataType(type: StepDataType) {
      passthroughType.value = type
    },
  } as IStepHandler<T, R>
}
