// ------------------------------------------------------------
// StepHandlerOptions
// ------------------------------------------------------------

import { reactive, shallowRef, watch } from 'vue'
import type {
  Config,
  EffectiveInputConstructors,
  EffectiveOutputConstructor,
  NodeId,
  StepDataType,
  StepMeta,
  WatcherTarget,
} from '../src/lib/pipeline/_types.ts'
import { InvalidInputTypeError } from '../src/lib/pipeline/errors/InvalidInputTypeError.ts'
import type { StepValidationError } from '../src/lib/pipeline/errors/StepValidationError.ts'
import type { InitializedForkNode, InitializedNode, InitializedStepNode } from '../src/lib/pipeline/Node.ts'
import type { ForkRunner, NodeRunner, NormalRunner } from '../src/lib/pipeline/NodeRunner.ts'
import type { ReactiveConfigType, StepContext, StepInputTypesToInstances } from '../src/lib/pipeline/Step.ts'
import { type StepRegistry, useStepRegistry } from '../src/lib/pipeline/StepRegistry.ts'
import { PassThrough } from '../src/lib/step-data-types/PassThrough.ts'
import { usePipelineStore } from '../src/lib/store/pipeline-store.ts'
import { deepUnwrap } from '../src/lib/util/vue-util.ts'

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
    defaults: WatcherTarget[],
  ) => WatcherTarget[]

  validateInput?: (
    inputData: StepInputTypesToInstances<EffectiveInputConstructors<M>>,
    inputTypes: EffectiveInputConstructors<M>,
  ) => StepValidationError[]

  onRemoving?: (node: InitializedNode<M, StepContext<M, C, SC, RC>>) => void
  onRemoved?: (id: NodeId) => void
  onAdded?: (node: InitializedNode<M, StepContext<M, C, SC, RC>>) => void

  run: R
}

// ------------------------------------------------------------
// IStepHandler
// ------------------------------------------------------------

export interface IStepHandler<
  M extends StepMeta<any, any>,
  T extends StepContext<any, any, any, any>,
  R extends NodeRunner<T>,
> {
  readonly meta: M

  config(): T['C']
  reactiveConfig(defaults: T['C']): T['RC']

  watcherTargets(
    node: InitializedNode<M, T>,
    defaults: WatcherTarget[],
  ): WatcherTarget[]

  loadConfig(config: T['RC'], serialized: T['SC']): void
  serializeConfig(config: T['C']): T['SC']
  deserializeConfig(serialized: T['SC']): T['C']

  validateInput(
    inputData: T['Input'] | null,
    inputTypes: T['InputConstructors'],
  ): StepValidationError[]

  onRemoving?: (node: InitializedNode<M, T>) => void
  onRemoved?: (id: NodeId) => void
  onAdded?: (node: InitializedNode<M, T>) => void

  run: R

  setPassThroughDataType(type: StepDataType): void
  clearPassThroughDataType(): void

  readonly currentInputDataTypes: readonly StepDataType[]
  readonly currentOutputDataType: StepDataType
}

// ------------------------------------------------------------
// makeStepHandler
// ------------------------------------------------------------

export function makeStepHandler<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  R extends NodeRunner<StepContext<M, C, SC, RC>>,
>(
  meta: M,
  options: StepHandlerOptions<M, C, SC, RC, R>,
  registry: StepRegistry = useStepRegistry(),
): IStepHandler<M, StepContext<M, C, SC, RC>, R> {

  type T = StepContext<M, C, SC, RC>
  type InputConstructors = EffectiveInputConstructors<M>
  type OutputConstructor = EffectiveOutputConstructor<M>

  registry.validateDefRegistration(meta)

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

    config() {
      return options.config?.() ?? ({} as C)
    },

    reactiveConfig(defaults) {
      return options.reactiveConfig?.(defaults) ?? reactive(defaults) as RC
    },

    watcherTargets(node, defaults) {
      return options.watcherTargets?.(node, defaults) ?? defaults
    },

    serializeConfig(config) {
      if (options.serializeConfig) return options.serializeConfig(config)
      return { ...deepUnwrap(config) as object } as SC
    },

    deserializeConfig(serialized) {
      if (options.deserializeConfig) return options.deserializeConfig(serialized)
      return { ...serialized } as unknown as C
    },

    loadConfig(config, serialized) {
      if (options.loadConfig) return options.loadConfig(config, serialized)
      Object.assign(config, handler.deserializeConfig(serialized))
    },

    validateInput(inputData, inputTypes) {
      if (options.validateInput) {
        return options.validateInput(
          inputData as StepInputTypesToInstances<InputConstructors>,
          inputTypes as InputConstructors,
        )
      }

      if (inputData === null) return []

      if ((inputTypes as any[]).some(t => (inputData as any) instanceof t)) return []

      const received = (inputData as any).constructor
      return [new InvalidInputTypeError(inputTypes, received)]
    },

    onRemoving: options.onRemoving,
    onRemoved: options.onRemoved,
    onAdded: options.onAdded,

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

    setPassThroughDataType(type) {
      passthroughType.value = type
    },
  }

  return handler
}

// ------------------------------------------------------------
// useCoreStepHandler
// ------------------------------------------------------------

export function useCoreStepHandler<
  M extends StepMeta<any, any>,
  T extends StepContext<any, any, any, any>,
>(
  nodeId: NodeId,
  handler: IStepHandler<M, T, NodeRunner<T>>,
) {
  const store = usePipelineStore()
  const node = store.get(nodeId) as InitializedNode<M, T>

  node.initialize(handler)
  handler.onAdded?.(node)

  node.getWatcherTargets().forEach(({ name, target }) => {
    watch(target, () => {
      store.markDirty(node.id)
    }, { deep: true })
  })

  return node
}

// ------------------------------------------------------------
// useStepHandler (Normal)
// ------------------------------------------------------------

export function useStepHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  M extends StepMeta<I, O>,
>(
  nodeId: NodeId,
  meta: M,
  options: StepHandlerOptions<
    M,
    C,
    SC,
    RC,
    NormalRunner<StepContext<M, C, SC, RC>>
  >,
): InitializedStepNode<M, StepContext<M, C, SC, RC>> {

  const handler = makeStepHandler(meta, options)
  type T = StepContext<M, C, SC, RC>

  return useCoreStepHandler<M, T>(nodeId, handler) as InitializedStepNode<M, T>
}

// ------------------------------------------------------------
// useForkHandler (Fork)
// ------------------------------------------------------------

export function useForkHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  M extends StepMeta<I, O>,
>(
  nodeId: NodeId,
  meta: M,
  options: StepHandlerOptions<
    M,
    C,
    SC,
    RC,
    ForkRunner<StepContext<M, C, SC, RC>>
  >,
): InitializedForkNode<M, StepContext<M, C, SC, RC>> {

  const handler = makeStepHandler(meta, options)
  type T = StepContext<M, C, SC, RC>

  return useCoreStepHandler<M, T>(nodeId, handler) as InitializedForkNode<M, T>
}
