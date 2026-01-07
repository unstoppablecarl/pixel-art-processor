import { reactive } from 'vue'
import type { Optional } from '../_helpers.ts'
import type { BaseDataStructure } from '../step-data-types/BaseDataStructure.ts'
import { PassThrough } from '../step-data-types/PassThrough.ts'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import type { Config, StepDataConfig, StepDataType, WatcherTarget } from './_types.ts'
import { InvalidInputTypeError } from './errors/InvalidInputTypeError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import type { InitializedBranchNode, InitializedForkNode, InitializedNode, InitializedStepNode } from './Node.ts'
import type { ForkStepRunner, NodeRunner, NormalStepRunner } from './NodeRunner.ts'
import type { AnyStepContext, ReactiveConfigType, StepContext, StepInputTypesToInstances } from './Step.ts'
import { type StepRegistry, useStepRegistry } from './StepRegistry.ts'

export type StepHandlerOptional =
  | 'watcherTargets'
  | 'serializeConfig'
  | 'deserializeConfig'
  | 'config'
  | 'reactiveConfig'
  | 'loadConfig'
  | 'validateInput'
  | 'onRemove'

export type StepHandlerOptionsOmit =
  | 'setPassThroughDataType'
  | 'clearPassThroughDataType'

export interface IStepHandlerBase<
  T extends AnyStepContext,
  R extends NodeRunner<T>,
> {
  inputDataTypes: T['InputConstructors']
  outputDataType: T['OutputConstructors']

  config(): T['C']
  reactiveConfig(defaults: T['C']): T['RC']

  loadConfig(config: T['RC'], serializedConfig: T['SerializedConfig']): void
  serializeConfig(config: T['C']): T['SerializedConfig']
  deserializeConfig(serializedConfig: T['SerializedConfig']): T['C']

  validateInput(
    inputData: T['Input'],
    inputDataTypes: T['InputConstructors'],
  ): StepValidationError[]

  run: R

  setPassThroughDataType(type: StepDataType): void
  clearPassThroughDataType(): void

  watcherTargets?(
    node: InitializedNode<T>,
    defaultWatcherTargets: WatcherTarget[],
  ): WatcherTarget[]

  onRemove?(
    store: PipelineStore,
    node: InitializedNode<T>,
  ): void
}

export interface INodeHandler<
  T extends AnyStepContext,
  R extends NodeRunner<T>,
  N extends InitializedNode<T>,
> extends IStepHandlerBase<T, R> {
  watcherTargets(
    node: N,
    defaultWatcherTargets: WatcherTarget[],
  ): WatcherTarget[]

  onRemove(
    store: PipelineStore,
    node: N,
  ): void
}

export type IStepHandler<T extends AnyStepContext> =
  INodeHandler<T, NormalStepRunner<T>, InitializedStepNode<T>>

export type IForkHandler<T extends AnyStepContext> =
  INodeHandler<T, ForkStepRunner<T>, InitializedForkNode<T>>

export type IBranchHandler<T extends AnyStepContext> =
  INodeHandler<T, NormalStepRunner<T>, InitializedBranchNode<T>>

export type AnyNodeHandler<T extends AnyStepContext> =
  | IStepHandler<T>
  | IForkHandler<T>
  | IBranchHandler<T>

export type StepHandlerOptions<
  T extends AnyStepContext,
  R extends NodeRunner<T>,
> =
  Omit<
    Optional<IStepHandlerBase<T, R>, StepHandlerOptional>,
    StepHandlerOptionsOmit | 'inputDataTypes' | 'outputDataType'
  >
  & StepDataConfig<T['InputConstructors'], T['OutputConstructors']>

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
  config?: () => C
  reactiveConfig?: (defaults: C) => RC

  serializeConfig?: (config: C) => SC
  deserializeConfig?: (config: SC) => C

  loadConfig?: (config: RC, serialized: SC) => void

  watcherTargets?: (
    node: InitializedNode<StepContext<C, SC, RC, I, O>>,
    defaultWatcherTargets: WatcherTarget[],
  ) => WatcherTarget[]

  validateInput?: (
    inputData: StepInputTypesToInstances<I>,
    inputTypes: I,
  ) => StepValidationError[]

  onRemove?: (
    store: PipelineStore,
    node: InitializedNode<StepContext<C, SC, RC, I, O>>,
  ) => void

  run: R
} & ({
  passthrough?: false
  inputDataTypes: I
  outputDataType: O
} | {
  passthrough: true
  inputDataTypes?: undefined
  outputDataType?: undefined
})

function makeBaseHandler<
  T extends AnyStepContext,
  R extends NodeRunner<T>,
>(
  def: string,
  options: StepHandlerOptions<T, R>,
  stepRegistry: StepRegistry = useStepRegistry(),
): IStepHandlerBase<T, R> {
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

  const base: IStepHandlerBase<T, R> = {
    config(): C {
      // default empty config; most handlers will override
      return {} as C
    },

    reactiveConfig(defaults: C): RC {
      return reactive(defaults) as RC
    },

    loadConfig(config: RC, serializedConfig: SerializedConfig): void {
      const deserialized = this.deserializeConfig(serializedConfig)
      Object.assign(config as object, deserialized)
    },

    deserializeConfig(serializedConfig: SerializedConfig): C {
      return {
        ...serializedConfig,
      } as C
    },

    serializeConfig(config: C): SerializedConfig {
      const unwrapped = deepUnwrap(config)
      return {
        ...unwrapped,
      } as SerializedConfig
    },

    validateInput(
      inputData: Input | null,
      inputDataTypes: InputConstructors,
    ): StepValidationError[] {
      if (inputData === null) return []

      if ((inputDataTypes as any[]).some(c => (inputData as any) instanceof c)) {
        return []
      }

      const receivedType = (inputData as BaseDataStructure).constructor as StepDataType
      return [
        new InvalidInputTypeError(inputDataTypes, receivedType),
      ]
    },

    // Node-agnostic defaults; these get wrapped for node-specific handlers.
    watcherTargets(
      _node: InitializedNode<T>,
      defaultWatcherTargets: WatcherTarget[],
    ): WatcherTarget[] {
      return options.watcherTargets?.(_node, defaultWatcherTargets) ?? defaultWatcherTargets
    },

    onRemove(store: PipelineStore, node: InitializedNode<T>): void {
      options.onRemove?.(store, node)
    },

    // user-provided bits (run, custom config, etc.)
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
  }

  return base
}

function adaptHandler<
  T extends AnyStepContext,
  R extends NodeRunner<T>,
  N extends InitializedNode<T>,
>(base: IStepHandlerBase<T, R>): INodeHandler<T, R, N> {
  return base as INodeHandler<T, R, N>
}

export function makeStepHandler<T extends AnyStepContext>(
  def: string,
  options: StepHandlerOptions<T, NormalStepRunner<T>>,
  stepRegistry: StepRegistry = useStepRegistry(),
): IStepHandler<T> {
  const base = makeBaseHandler<T, NormalStepRunner<T>>(def, options, stepRegistry)
  return adaptHandler<T, NormalStepRunner<T>, InitializedStepNode<T>>(base)
}

export function makeForkHandler<T extends AnyStepContext>(
  def: string,
  options: StepHandlerOptions<T, ForkStepRunner<T>>,
  stepRegistry: StepRegistry = useStepRegistry(),
): IForkHandler<T> {
  const base = makeBaseHandler<T, ForkStepRunner<T>>(def, options, stepRegistry)
  return adaptHandler<T, ForkStepRunner<T>, InitializedForkNode<T>>(base)
}

export function makeBranchHandler<T extends AnyStepContext>(
  def: string,
  options: StepHandlerOptions<T, NormalStepRunner<T>>,
  stepRegistry: StepRegistry = useStepRegistry(),
): IBranchHandler<T> {
  const base = makeBaseHandler<T, NormalStepRunner<T>>(def, options, stepRegistry)
  return adaptHandler<T, NormalStepRunner<T>, InitializedBranchNode<T>>(base)
}
