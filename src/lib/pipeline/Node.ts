import type { MinStore } from '../store/pipeline-store.ts'
import { type ImgSize, logNodeEvent } from '../util/misc.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import {
  type IRunnerResultMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type WatcherTarget,
  type WithRequired,
} from './_types.ts'
import { GenericValidationError } from './errors/GenericValidationError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import { type AnyBranchNode, type AnyBranchNodeSerialized, BranchNode } from './Node/BranchNode.ts'
import { type AnyForkNodeSerialized, ForkNode } from './Node/ForkNode.ts'
import { type AnyStepNode, type AnyStepNodeSerialized, StepNode } from './Node/StepNode.ts'
import type { NodeRunner, NormalStepRunner, SingleRunnerOutput, SingleRunnerResult } from './NodeRunner.ts'
import type { AnyStepContext, StepLoaderSerialized } from './Step.ts'
import { type IStepHandler, makeStepHandler, type StepHandlerOptions } from './StepHandler.ts'
import { useStepRegistry } from './StepRegistry.ts'

export type BaseNodeSerialized<T extends AnyStepContext> = {
  id: NodeId,
  def: NodeDef,
  seed: number,
  visible: boolean,
  config: T['SerializedConfig'],
  prevNodeId?: NodeId | null,
}

export type BaseNodeOptions<T extends AnyStepContext> = {
  id: NodeId,
  def: NodeDef,
  seed?: number,
  visible?: boolean,
  config?: T['SerializedConfig'],
  prevNodeId?: NodeId | null,
}

export abstract class BaseNode<
  T extends AnyStepContext,
  R extends NodeRunner<T>,
  N extends InitializedNode<T>,
  PrevNode extends AnyNode
> {
  readonly abstract type: NodeType
  // serialized
  id: NodeId
  def: NodeDef
  seed = 0
  config: T['RC'] | undefined
  visible = true
  prevNodeId: NodeId | null

  // transient
  seedSum = 0
  validationErrors: StepValidationError[] = []
  loadSerialized: StepLoaderSerialized<T['SerializedConfig']> = null
  handler: IStepHandler<T, R, N> | undefined

  // system
  isDirty = false
  isProcessing = false
  initialized = false
  lastExecutionTimeMS: undefined | number

  constructor({ id, def, seed = 0, visible = true, config, prevNodeId = null }: BaseNodeOptions<T>) {
    this.id = id
    this.def = def
    this.seed = seed
    this.visible = visible
    this.prevNodeId = prevNodeId

    if (config) {
      this.loadSerialized = { config }
    }
  }

  isReady(store: MinStore) {
    if (this.isProcessing) return false
    if (!this.initialized) return false
    if (!this.isDirty) return false

    if (!this.prevNodeId) return true

    return store.get(this.prevNodeId).outputReady()
  }

  outputReady(): boolean {
    return !this.isDirty
      && !this.isProcessing
      && this.initialized
  }

  async processRunner(store: MinStore) {
    logNodeEvent(this.id, 'processRunner: start')

    this.isProcessing = true
    const startTime = performance.now()

    await this.runner(store)

    this.isProcessing = false
    this.isDirty = false
    this.lastExecutionTimeMS = performance.now() - startTime
    logNodeEvent(this.id, 'processRunner: end', deepUnwrap(this))
  }

  abstract runner(store: MinStore): Promise<void>

  abstract childIds(store: MinStore): NodeId[]

  abstract getOutputSize(): ImgSize

  abstract getOutputFromPrev(store: MinStore): Promise<SingleRunnerResult<any>>

  protected setPassThroughDataTypeFromPrev(store: MinStore): void {
    if (this.prevNodeId) {
      const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
      this.handler!.setPassThroughDataType(prev.handler!.outputDataType)
    } else {
      this.handler!.clearPassThroughDataType()
    }
  }

  serialize(): BaseNodeSerialized<T> {

    let config: T['SerializedConfig'] = undefined
    if (this.handler) {
      config = this.handler.serializeConfig(this.config)
    } else {
      config = this.loadSerialized?.config
    }

    return {
      id: this.id,
      def: this.def,
      seed: this.seed,
      visible: this.visible,
      config: config,
    }
  }

  initialize(handlerOptions: StepHandlerOptions<T>): void {
    const handler = makeStepHandler<T>(this.def, handlerOptions)

    this.handler = handler as IStepHandler<T, R, N>

    if (this.config === undefined) {
      this.config = handler.reactiveConfig(handler.config())
    }

    if (this.loadSerialized) {
      handler.loadConfig(this.config as T['RC'], this.loadSerialized.config)
      this.loadSerialized = null
    }
    this.initialized = true
  }

  getSeedSum(store: MinStore): number {
    this.seedSum = this.seed
    if (this.prevNodeId) {
      this.seedSum += store.get(this.prevNodeId).seedSum
    }
    return this.seedSum
  }

  getWatcherTargets(): WatcherTarget[] {
    const defaults = [
      {
        name: 'config',
        target: () => this.config,
      },
      {
        name: 'seed',
        target: () => this.seed,
      },
    ]

    return this.handler!.watcherTargets(this as unknown as N, defaults)
  }

  getPrev(store: MinStore): PrevNode | undefined {
    if (!this.prevNodeId) return
    return store.get(this.prevNodeId) as PrevNode
  }
}

type AbstractConstructor = abstract new (...args: any[]) => any

export function WithStepOrFork<TBase extends AbstractConstructor>(Base: TBase) {
  abstract class StepOrForkNode extends Base {
    async getOutputFromPrev(store: MinStore): Promise<SingleRunnerResult<any>> {
      if (!this.prevNodeId) {
        return parseResult(null)
      }

      const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode

      return {
        output: prev.outputData,
        meta: prev.outputMeta,
        preview: prev.outputPreview,
        validationErrors: prev.validationErrors,
      }
    }
  }

  return StepOrForkNode
}

export abstract class StepOrBranchNode<
  T extends AnyStepContext,
  N extends InitializedStepNode<T> | InitializedBranchNode<T>,
  PrevNode extends AnyNode
> extends BaseNode<T, NormalStepRunner<T>, N, PrevNode> {
  outputData: T['Output'] | null = null
  outputPreview: ImageData | null = null
  outputMeta: IRunnerResultMeta = {}

  childIds(store: MinStore): NodeId[] {
    const result = Object.values(store.nodes).find(n => n.prevNodeId === this.id) as AnyNode
    return result ? [result.id] : []
  }

  getOutputSize(): ImgSize {
    return {
      width: this.outputData?.width ?? 0,
      height: this.outputData?.height ?? 0,
    }
  }
}

export type AnyNode<T extends AnyStepContext = AnyStepContext> = StepNode<T> | ForkNode<T> | BranchNode<T>
export type GraphNode<T extends AnyStepContext> =
  | StepNode<T>
  | ForkNode<T>
  | BranchNode<T>

export type InitializedStepNode<T extends AnyStepContext> = WithRequired<StepNode<T>, 'config' | 'handler'>
export type InitializedForkNode<T extends AnyStepContext> = WithRequired<ForkNode<T>, 'config' | 'handler'>
export type InitializedBranchNode<T extends AnyStepContext> = WithRequired<BranchNode<T>, 'config' | 'handler'>

export type InitializedNode<T extends AnyStepContext> =
  | InitializedStepNode<T>
  | InitializedForkNode<T>
  | InitializedBranchNode<T>

export type AnyInitializedNode = InitializedNode<AnyStepContext>
export type AnyNodeSerialized = AnyStepNodeSerialized | AnyForkNodeSerialized | AnyBranchNodeSerialized

export function deSerializeNode(data: AnyNodeSerialized): AnyNode {
  if (isStepSerialized(data)) {
    return new StepNode(data)
  }

  if (isForkSerialized(data)) {
    return new ForkNode(data)
  }

  if (isBranchSerialized(data)) {
    return new BranchNode(data)
  }

  const message = 'invalid serialized node'
  console.error(message, data)
  throw new Error(message)
}

export const isStep = (n: AnyNode | AnyInitializedNode): n is StepNode<any> => useStepRegistry().getNodeType(n.def) === NodeType.STEP
export const isFork = (n: AnyNode | AnyInitializedNode): n is ForkNode<any> => useStepRegistry().getNodeType(n.def) === NodeType.FORK
export const isBranch = (n: AnyNode | AnyInitializedNode): n is BranchNode<any> => useStepRegistry().getNodeType(n.def) === NodeType.BRANCH

const isStepSerialized = (n: AnyNodeSerialized): n is AnyStepNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.STEP
const isForkSerialized = (n: AnyNodeSerialized): n is AnyForkNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.FORK
const isBranchSerialized = (n: AnyNodeSerialized): n is AnyBranchNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.BRANCH

export function parseResult<T extends AnyStepContext>(result: SingleRunnerOutput<T>): SingleRunnerResult<T> {
  const output = result?.output ?? null
  const preview = result?.preview ?? null

  return {
    output: Object.freeze(output),
    preview: Object.freeze(preview),
    meta: Object.freeze(structuredClone(output?.meta ?? {})),
    validationErrors: result?.validationErrors?.map(parseValidationError) ?? [],
  }
}

function parseValidationError(error: StepValidationError | string) {
  if (typeof error === 'string') return new GenericValidationError(error)

  return error
}