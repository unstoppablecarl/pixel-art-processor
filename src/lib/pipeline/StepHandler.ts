import { reactive, shallowRef } from 'vue'
import type { BaseDataStructure } from '../step-data-types/BaseDataStructure.ts'
import { PassThrough } from '../step-data-types/PassThrough.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import type {
  AnyStepMeta,
  Config,
  EffectiveInputConstructors,
  EffectiveOutputConstructor,
  NodeId,
  StepDataType,
  StepMeta,
  WatcherTarget,
} from './_types.ts'
import { InvalidInputTypeError } from './errors/InvalidInputTypeError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
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
  | 'meta'
  | 'currentInputDataTypes'
  | 'currentOutputDataType'

// ⚠️ property order matters here ⚠️
// anything that references SC must come after serializeConfig()
export type StepHandlerOptions<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  R extends NodeRunner<StepContext<M, C, SC, RC>>,
> = {
  config?: () => C
  reactiveConfig?: (defaults: C) => RC

  serializeConfig?: (config: C) => SC
  deserializeConfig?: (config: SC) => C

  loadConfig?: (config: RC, serialized: SC) => void

  watcherTargets?: (
    node: InitializedNode<M, StepContext<M, C, SC, RC>>,
    defaultWatcherTargets: WatcherTarget[],
  ) => WatcherTarget[]

  validateInput?: (
    inputData: StepInputTypesToInstances<EffectiveInputConstructors<M>>,
    inputTypes: EffectiveInputConstructors<M>,
  ) => StepValidationError[]

  onRemoving?: (node: InitializedNode<M, StepContext<M, C, SC, RC>>) => void
  onRemoved?: (id: NodeId) => void
  onAdded?: (node: InitializedNode<M, StepContext<M, C, SC, RC>>) => void
  onAfterRun?: (node: InitializedNode<M, StepContext<M, C, SC, RC>>) => void

  run: R
}

export interface IStepHandler<
  M extends AnyStepMeta,
  T extends AnyStepContext,
  R extends NodeRunner<T> = NodeRunner<T>,
> {
  readonly meta: M,

  // fresh default config instance
  config(): T['C'],

  // wraps default config in reactivity
  reactiveConfig(defaults: T['C']): T['RC'],

  // watch config and trigger updates
  watcherTargets(node: InitializedNode<M, T>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[]

  // apply loaded config to internal reactive config
  loadConfig(config: T['RC'], serializedConfig: T['SC']): void,

  // convert config to storage
  serializeConfig(config: T['C']): T['SC'],

  // convert config from storage
  deserializeConfig(serializedConfig: T['SC']): T['C'],

  validateInput(inputData: T['Input'], inputDataTypes: T['InputConstructors']): StepValidationError[],

  onRemoving?: (node: InitializedNode<M, T>) => void
  onRemoved?: (id: NodeId) => void
  onAdded?: (node: InitializedNode<M, T>) => void
  onAfterRun?: (node: InitializedNode<M, T>) => void

  run: R,

  setPassThroughDataType: (passthroughType: StepDataType) => void,
  clearPassThroughDataType: () => void,

  currentInputDataTypes: readonly StepDataType[],
  currentOutputDataType: StepDataType,
}

export function makeStepHandler<
  M extends AnyStepMeta,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  R extends NodeRunner<StepContext<M, C, SC, RC>>
>(
  meta: M,
  options: StepHandlerOptions<M, C, SC, RC, R>,
  stepRegistry: StepRegistry = useStepRegistry(),
): IStepHandler<M, StepContext<M, C, SC, RC>, R> {
  type T = StepContext<M, C, SC, RC>
  type Input = T['Input']
  type InputConstructors = EffectiveInputConstructors<M>
  type OutputConstructor = EffectiveOutputConstructor<M>

  stepRegistry.validateDefRegistration(meta)

  const defaultInput = (meta.passthrough
      ? [PassThrough]
      : meta.inputDataTypes
  ) as InputConstructors

  const defaultOutput = (meta.passthrough
      ? PassThrough
      : meta.outputDataType
  ) as OutputConstructor

  const passthroughType = shallowRef<StepDataType | undefined>(undefined)

  const handler: IStepHandler<M, T, R> = {
    meta,

    config(): C {
      return (options.config?.() ?? ({} as C))
    },

    reactiveConfig(defaults: C): RC {
      if (options.reactiveConfig) {
        return options.reactiveConfig(defaults)
      }
      return reactive(defaults) as RC
    },

    watcherTargets(
      node: InitializedNode<M, T>,
      defaults: WatcherTarget[],
    ): WatcherTarget[] {
      return options.watcherTargets?.(
        node,
        defaults,
      ) ?? defaults
    },

    deserializeConfig(serializedConfig: SC): C {
      if (options.deserializeConfig) {
        return options.deserializeConfig(serializedConfig)
      }
      return { ...serializedConfig } as unknown as C
    },

    serializeConfig(config: T['RC']): SC {
      if (options.serializeConfig) {
        return options.serializeConfig(config as unknown as C)
      }
      const unwrapped = deepUnwrap(config)
      return { ...unwrapped } as SC
    },

    loadConfig(config: RC, serializedConfig: SC): void {
      if (options.loadConfig) {
        options.loadConfig(config, serializedConfig)
        return
      }
      const deserialized = handler.deserializeConfig(serializedConfig)
      Object.assign(config as any, deserialized)
    },

    validateInput(
      inputData: Input | null,
      inputDataTypes: T['InputConstructors'],
    ): StepValidationError[] {
      if (options.validateInput) {
        return options.validateInput(
          inputData as StepInputTypesToInstances<InputConstructors>,
          inputDataTypes as InputConstructors,
        )
      }

      if (inputData === null) return []

      if ((inputDataTypes as any[]).some(c => (inputData as any) instanceof c)) {
        return []
      }

      const receivedType = (inputData as BaseDataStructure)
        .constructor as StepDataType

      return [new InvalidInputTypeError(inputDataTypes, receivedType)]
    },

    onRemoving: options.onRemoving as any,
    onRemoved: options.onRemoved,
    onAdded: options.onAdded as any,
    // onAfterRun: options.onAfterRun,

    run: options.run,

    get currentInputDataTypes() {
      return passthroughType.value ? [passthroughType.value] : defaultInput
    },

    get currentOutputDataType() {
      return passthroughType.value ?? defaultOutput
    },

    clearPassThroughDataType() {
      passthroughType.value = undefined
    },

    setPassThroughDataType(type: StepDataType) {
      passthroughType.value = type
    },
  }

  return handler
}

