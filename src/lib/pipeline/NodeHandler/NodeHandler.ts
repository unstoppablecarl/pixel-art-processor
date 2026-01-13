import { reactive, type Reactive, shallowRef } from 'vue'
import type { NodeDataType, StepInputTypesToInstances } from '../../node-data-types/_node-data-types.ts'
import { PassThrough } from '../../node-data-types/PassThrough.ts'
import type {
  IRunnerResultMeta,
  NodeId,
  NormalizedConfig,
  NormalizedReactiveConfig,
  WatcherTarget,
} from '../_types.ts'
import type { StepValidationError } from '../errors/StepValidationError.ts'
import type { InitializedNode } from '../Node.ts'
import {
  type AnyBranchMeta,
  type AnyForkMeta,
  type AnyNodeMeta,
  type AnyStepMeta,
  getMetaInput,
  isPassthroughMeta,
  type MetaIO,
} from '../types/definitions.ts'
import type { BranchHandler } from './BranchHandler.ts'
import type { ForkHandler } from './ForkHandler.ts'
import type { StepHandler } from './StepHandler.ts'

export type NodeHandler<
  C,
  SC,
  RC,
  M extends AnyNodeMeta
> = {
  meta: M
  config: () => NormalizedConfig<C>
  reactiveConfig: (defaults: NormalizedConfig<C>) => NormalizedReactiveConfig<C, RC>
  serializeConfig: (config: NormalizedConfig<C>) => SC
  deserializeConfig: (serialized: SC) => NormalizedConfig<C>
  loadConfig: (config: RC, serializedConfig: SC) => void
  watcherTargets(node: InitializedNode<C, SC, RC>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[]
  validateInput(inputData: StepInputTypesToInstances<MetaIO<M>[0]>, inputDataTypes: MetaIO<M>[0], inputMeta: IRunnerResultMeta | null): StepValidationError[],
  setPassThroughDataType: (passthroughType: NodeDataType) => void,
  clearPassThroughDataType: () => void,

  currentInputDataTypes: readonly NodeDataType[],
  currentOutputDataType: NodeDataType,

  onRemoving?: (node: InitializedNode<C, SC, RC>) => void,
  onRemoved?: (id: NodeId) => void,
  onAdded?: (node: InitializedNode<C, SC, RC>) => void,
  onAfterRun?: (node: InitializedNode<C, SC, RC>) => void,
}

export type NodeHandlerOptions<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends AnyNodeMeta = AnyNodeMeta
> = Partial<
  Omit<
    NodeHandler<C, SC, RC, M>,
    | 'setPassThroughDataType'
    | 'clearPassThroughDataType'
    | 'currentInputDataTypes'
    | 'currentOutputDataType'
  >
>

export function makeHandler<
  C,
  SC,
  RC,
  M extends AnyNodeMeta,
>(
  meta: M,
  options: NodeHandlerOptions<C, SC, RC, M> | undefined,
) {
  type Config = NormalizedConfig<C>
  type ReactiveConfig = NormalizedReactiveConfig<C, RC>
  type Input = StepInputTypesToInstances<MetaIO<M>[0]>

  const defaults = {
    config: (() => ({} as Config)),
    reactiveConfig: ((defaults: Config) => reactive(defaults as object) as ReactiveConfig),
    serializeConfig: ((config: RC) => config as unknown as SC),
    deserializeConfig: ((serialized: SC) => serialized as unknown as Config),
    loadConfig: ((config: RC, serializedConfig: SC) => {
      const deserialized = deserializeConfig(serializedConfig)
      Object.assign(config as any, deserialized)
    }),
    watcherTargets(
      node: any,
      defaults: WatcherTarget[],
    ): WatcherTarget[] {
      return defaults
    },
    validateInput(inputData: Input | null, inputDataTypes: MetaIO<M>[0], inputMeta: IRunnerResultMeta | null): StepValidationError[] {
      return []
    },
  }

  const config = options?.config ?? defaults.config
  const reactiveConfig = options?.reactiveConfig ?? defaults.reactiveConfig
  const serializeConfig = options?.serializeConfig ?? defaults.serializeConfig
  const deserializeConfig = options?.deserializeConfig ?? defaults.deserializeConfig
  const loadConfig = options?.loadConfig ?? defaults.loadConfig
  const watcherTargets = options?.watcherTargets ?? defaults.watcherTargets
  const validateInput = options?.validateInput ?? defaults.validateInput

  let defaultInput: MetaIO<M>[0] = getMetaInput(meta)

  const defaultOutput = (isPassthroughMeta(meta)
      ? PassThrough
      : meta.outputDataType
  ) as MetaIO<M>[1]

  const passthroughType = shallowRef<NodeDataType | undefined>(undefined)

  return {
    meta,
    config: config as () => Config,
    reactiveConfig: reactiveConfig as (defaults: Config) => ReactiveConfig,
    serializeConfig: serializeConfig as (config: Config) => SC,
    deserializeConfig: deserializeConfig as (serialized: SC) => Config,
    loadConfig: loadConfig as (config: RC, serializedConfig: SC) => void,
    watcherTargets: watcherTargets as (node: any, defaults: WatcherTarget[]) => WatcherTarget[],
    validateInput: validateInput as (inputData: StepInputTypesToInstances<MetaIO<M>[0]>, inputDataTypes: MetaIO<M>[0], inputMeta: IRunnerResultMeta | null) => StepValidationError[],

    get currentInputDataTypes() {
      return passthroughType.value ? [passthroughType.value] : defaultInput
    },

    get currentOutputDataType() {
      return passthroughType.value ?? defaultOutput
    },

    clearPassThroughDataType() {
      passthroughType.value = undefined
    },

    setPassThroughDataType(type: NodeDataType) {
      passthroughType.value = type
    },
  } as NodeHandler<C, SC, RC, M>
}

export type AnyHandler<
  C,
  SC,
  RC,
  M extends AnyNodeMeta = AnyNodeMeta
> =
  | StepHandler<C, SC, RC, Extract<M, AnyStepMeta<any, any>>>
  | ForkHandler<C, SC, RC, Extract<M, AnyForkMeta<any, any>>>
  | BranchHandler<C, SC, RC, Extract<M, AnyBranchMeta<any, any>>>
