import { reactive, type Reactive, shallowRef } from 'vue'
import type { BaseDataStructure } from '../../step-data-types/BaseDataStructure.ts'
import { PassThrough } from '../../step-data-types/PassThrough.ts'
import type {
  NodeId,
  NormalizedConfig,
  NormalizedReactiveConfig,
  StepDataType,
  StepInputTypesToInstances,
  StepMeta,
  WatcherTarget,
} from '../_types.ts'
import { InvalidInputTypeError } from '../errors/InvalidInputTypeError.ts'
import type { StepValidationError } from '../errors/StepValidationError.ts'
import type { InitializedNode } from '../Node.ts'
import type { BranchHandler } from './BranchHandler.ts'
import type { ForkHandler } from './ForkHandler.ts'
import type { StepHandler } from './StepHandler.ts'

export type NodeHandler<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<any, any> = StepMeta<I, O>,
> = {
  meta: M
  config: () => NormalizedConfig<C>
  reactiveConfig: (defaults: NormalizedConfig<C>) => NormalizedReactiveConfig<C, RC>
  serializeConfig: (config: NormalizedConfig<C>) => SC
  deserializeConfig: (serialized: SC) => NormalizedConfig<C>
  loadConfig: (config: RC, serializedConfig: SC) => void
  watcherTargets(node: InitializedNode<C, SC, RC, I, O>, defaultWatcherTargets: WatcherTarget[]): WatcherTarget[]
  validateInput(inputData: StepInputTypesToInstances<I>, inputDataTypes: I): StepValidationError[],
  setPassThroughDataType: (passthroughType: StepDataType) => void,
  clearPassThroughDataType: () => void,

  currentInputDataTypes: readonly StepDataType[],
  currentOutputDataType: StepDataType,

  onRemoving?: (node: InitializedNode<C, SC, RC, I, O>) => void,
  onRemoved?: (id: NodeId) => void,
  onAdded?: (node: InitializedNode<C, SC, RC, I, O>) => void,
  onAfterRun?: (node: InitializedNode<C, SC, RC, I, O>) => void,

}

export type NodeHandlerOptions<
  C = {},
  SC = C,
  RC = Reactive<C>,
  I extends readonly StepDataType[] = readonly StepDataType[],
  O extends StepDataType = StepDataType,
> = Partial<
  Omit<
    NodeHandler<C, SC, RC, I, O>,
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
  I extends readonly StepDataType[],
  O extends StepDataType,
>(
  meta: StepMeta<I, O>,
  options: NodeHandlerOptions<C, SC, RC, I, O> | undefined,
) {
  type Config = NormalizedConfig<C>
  type ReactiveConfig = NormalizedReactiveConfig<C, RC>
  type Input = StepInputTypesToInstances<I>

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
    validateInput(inputData: Input | null, inputDataTypes: I) {
      if (inputData === null) return []

      if ((inputDataTypes as unknown as any[]).some(c => (inputData as any) instanceof c)) {
        return []
      }

      const receivedType = (inputData as BaseDataStructure)
        .constructor as StepDataType

      return [new InvalidInputTypeError(inputDataTypes, receivedType)]
    },
  }

  const config = options?.config ?? defaults.config
  const reactiveConfig = options?.reactiveConfig ?? defaults.reactiveConfig
  const serializeConfig = options?.serializeConfig ?? defaults.serializeConfig
  const deserializeConfig = options?.deserializeConfig ?? defaults.deserializeConfig
  const loadConfig = options?.loadConfig ?? defaults.loadConfig
  const watcherTargets = options?.watcherTargets ?? defaults.watcherTargets
  const validateInput = options?.validateInput ?? defaults.validateInput

  const defaultInput = (meta.passthrough
      ? [PassThrough]
      : meta.inputDataTypes
  ) as I

  const defaultOutput = (meta.passthrough
      ? PassThrough
      : meta.outputDataType
  ) as O

  const passthroughType = shallowRef<StepDataType | undefined>(undefined)

  return {
    meta,
    config: config as () => Config,
    reactiveConfig: reactiveConfig as (defaults: Config) => ReactiveConfig,
    serializeConfig: serializeConfig as (config: Config) => SC,
    deserializeConfig: deserializeConfig as (serialized: SC) => Config,
    loadConfig: loadConfig as (config: RC, serializedConfig: SC) => void,
    watcherTargets: watcherTargets as (node: any, defaults: WatcherTarget[]) => WatcherTarget[],
    validateInput: validateInput as (inputData: StepInputTypesToInstances<I>, inputDataTypes: I) => StepValidationError[],

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
  } as NodeHandler<C, SC, RC, I, O>
}

export type AnyHandler<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
> =
  | StepHandler<C, SC, RC, I, O>
  | ForkHandler<C, SC, RC, I, O>
  | BranchHandler<C, SC, RC, I, O>