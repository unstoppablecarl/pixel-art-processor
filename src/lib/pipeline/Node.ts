import { Component, ref, type Ref } from 'vue'
import type { StepDataType } from '../../steps.ts'
import { type StepValidationError } from '../errors.ts'
import { PassThrough } from '../step-data-types/PassThrough.ts'
import type { MinStore } from '../store/pipeline-store.ts'
import { type ImgSize, logNodeEvent } from '../util/misc.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import type {
  ForkStepRunner,
  NodeRunner,
  NormalStepRunner,
  SingleRunnerOutput,
  SingleRunnerResult,
} from './NodeRunner.ts'
import type { AnyStepContext, StepLoaderSerialized } from './Step.ts'
import { type IStepHandler, makeStepHandler, type StepHandlerOptions, type WatcherTarget } from './StepHandler.ts'
import { useStepRegistry } from './StepRegistry.ts'

export enum NodeType {
  STEP = 'STEP',
  FORK = 'FORK',
  BRANCH = 'BRANCH',
}

export type NodeId = string & { readonly __nodeIdBrand: unique symbol }
export type NodeDef = string & { readonly __nodeDefBrand: unique symbol }

export type BaseNodeSerialized<T extends AnyStepContext> = {
  id: NodeId,
  def: NodeDef,
  seed: number,
  visible: boolean,
  config: T['SerializedConfig']
}

export type BaseNodeOptions<T extends AnyStepContext> = {
  id: NodeId,
  def: NodeDef,
  seed?: number,
  visible?: boolean,
  config?: T['SerializedConfig'],
}

export abstract class BaseNode<
  T extends AnyStepContext,
  R extends NodeRunner<T> = NodeRunner<T>
> {
  readonly abstract type: NodeType
  // serialized
  id: NodeId
  def: NodeDef
  seed = 0
  config: T['RC'] | undefined
  visible = true

  // transient
  seedSum = 0
  validationErrors: StepValidationError[] = []
  loadSerialized: StepLoaderSerialized<T['SerializedConfig']> = null
  handler: IStepHandler<T> | undefined

  // system
  isDirty = false
  isProcessing = false
  initialized = false
  lastExecutionTimeMS: undefined | number

  abstract prevNodeId: NodeId | null

  constructor({ id, def, seed = 0, visible = true, config }: BaseNodeOptions<T>) {
    this.id = id
    this.def = def
    this.seed = seed
    this.visible = visible

    if (config) {
      this.loadSerialized = { config }
    }
  }

  isReady(store: MinStore): boolean {
    return !this.isProcessing
      && this.initialized
      && this.isDirty
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

  abstract getOutputDataFromPrev(store: MinStore): Promise<T['Input'] | null>

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

    this.handler = handler as IStepHandler<T>

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
    return [
      this.config,
      () => this.seed,
    ]
  }
}

type StepNodeProperties = {
  prevNodeId: NodeId | null,
  muted: boolean
}
export type AnyStepNodeSerialized = StepNodeSerialized<AnyStepContext>
export type StepNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & StepNodeProperties
export type AnyStepNode = StepNode<AnyStepContext>
export type StepNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & Partial<StepNodeProperties>

export class StepNode<
  T extends AnyStepContext,
  R extends NormalStepRunner<T> = NormalStepRunner<T>
> extends BaseNode<T, R> {
  type = NodeType.STEP
  muted: boolean

  prevNodeId: NodeId | null
  outputData: T['Output'] | null = null
  outputPreview: ImageData | null = null

  constructor(options: StepNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId ?? null
    this.muted = options.muted ?? false
  }

  isReady(store: MinStore) {
    if (!super.isReady(store)) return false
    if (!this.prevNodeId) return true

    return store.get(this.prevNodeId).outputReady()
  }

  childIds(store: MinStore) {
    const result = Object.values(store.nodes).find(n => n.prevNodeId === this.id)
    return result ? [result.id] : []
  }

  serialize(): StepNodeSerialized<T> {
    return {
      ...super.serialize(),
      muted: this.muted,
      prevNodeId: this.prevNodeId,
    }
  }

  async runner(store: MinStore) {
    logNodeEvent(this.id, 'runner: start')
    if (this.muted) {
      this.outputData = await this.getOutputDataFromPrev(store)
      this.outputPreview = null
      this.validationErrors = []

      if (!this.prevNodeId) return
      const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
      this.handler!.setPassThroughDataType(prev.handler!.outputDataType)
      return
    }

    const _handler = this.handler as IStepHandler<T, R>
    const output = await _handler.run({
      config: this.config as T['RC'],
      inputData: await this.getOutputDataFromPrev(store),
    })

    const result = parseResult<T>(output)
    this.outputData = result.output
    this.outputPreview = result.preview
    this.validationErrors = result.validationErrors
    logNodeEvent(this.id, 'runner: end', result)

  }

  async getOutputDataFromPrev(store: MinStore): Promise<T['Input'] | null> {
    if (!this.prevNodeId) return null

    const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
    if (prev.outputData) {
      return prev.outputData.copy()
    }
    return null
  }

  getOutputSize(): ImgSize {
    return {
      width: this?.outputData?.width ?? 0,
      height: this?.outputData?.height ?? 0,
    }
  }

  getWatcherTargets(): WatcherTarget[] {
    return [...super.getWatcherTargets(), () => this.muted]
  }
}

type ForkNodeProperties = {
  prevNodeId?: NodeId | null,
  branchIds?: NodeId[],
}
export type AnyForkNodeSerialized = ForkNodeSerialized<AnyStepContext>
export type ForkNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & ForkNodeProperties
export type AnyForkNode = ForkNode<AnyStepContext>
export type ForkNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & ForkNodeProperties

export class ForkNode<
  T extends AnyStepContext,
  R extends ForkStepRunner<T> = ForkStepRunner<T>
> extends BaseNode<T, R> {
  type = NodeType.FORK
  branchIds = ref<NodeId[]>([])
  prevNodeId: NodeId | null
  forkOutputData: Ref<SingleRunnerResult<T>[]> = ref([])

  constructor(options: ForkNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId ?? null
    this.branchIds.value = options.branchIds ?? []
  }

  isReady(store: MinStore) {
    if (!super.isReady(store)) return false
    if (!this.prevNodeId) return true

    return store.get(this.prevNodeId).outputReady()
  }

  childIds(store: MinStore) {
    return this.branchIds.value
  }

  async runner(store: MinStore) {
    this.forkOutputData.value = await Promise.all(
      this.branchIds.value.map((_, i) => this.runBranch(store, i)),
    ) as SingleRunnerResult<T>[]

    this.validationErrors = this.forkOutputData.value.flatMap(({ validationErrors }) => validationErrors) ?? []
  }

  async getBranchOutput(store: MinStore, branchIndex: number): Promise<SingleRunnerResult<T>> {
    logNodeEvent(this.id, 'getBranchOutput: start', { branchIndex })
    if (this.forkOutputData.value[branchIndex] === undefined) {
      this.forkOutputData.value[branchIndex] = await this.runBranch(store, branchIndex)
      logNodeEvent(this.id, 'getBranchOutput: end', { branchIndex }, this.forkOutputData.value[branchIndex])
    } else {
      logNodeEvent(this.id, 'getBranchOutput: end (cached)', { branchIndex }, this.forkOutputData.value[branchIndex])
    }

    return this.forkOutputData.value[branchIndex]
  }

  private async runBranch(store: MinStore, branchIndex: number): Promise<
    SingleRunnerResult<T>
  > {
    logNodeEvent(this.id, 'runBranch', { branchIndex })
    const inputData = await this.getOutputDataFromPrev(store)
    const _handler = this.handler as IStepHandler<T, R>
    const output = await _handler.run({
      config: this.config as T['RC'],
      inputData,
      branchIndex,
    })

    return parseResult<T>(output)
  }

  serialize(): ForkNodeSerialized<T> {
    return {
      ...super.serialize(),
      prevNodeId: this.prevNodeId,
      branchIds: this.branchIds.value,
    }
  }

  async getOutputDataFromPrev(store: MinStore): Promise<T['Input'] | null> {
    if (!this.prevNodeId) return null

    const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
    if (prev.outputData) {
      return prev.outputData.copy()
    }
  }

  getOutputSize(): ImgSize {
    const first = this.forkOutputData.value[0]?.output
    return {
      width: first?.width ?? 0,
      height: first?.height ?? 0,
    }
  }
}

type BranchNodeProperties = {
  prevNodeId: NodeId,
  branchIndex: number,
}
export type AnyBranchNodeSerialized = BranchNodeSerialized<AnyStepContext>
export type BranchNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & BranchNodeProperties
export type AnyBranchNode = BranchNode<AnyStepContext>
export type BranchNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & BranchNodeProperties

export class BranchNode<
  T extends AnyStepContext,
  R extends NormalStepRunner<T> = NormalStepRunner<T>
> extends BaseNode<T, R> {
  type = NodeType.BRANCH
  outputData: T['Output'] | null = null
  outputPreview: ImageData | null = null

  prevNodeId: NodeId
  branchIndex: number
  initialized = true
  handler: IStepHandler<T>

  constructor(options: BranchNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId
    this.branchIndex = options.branchIndex
    let passthroughType: StepDataType | undefined = undefined

    this.handler = {
      get inputDataTypes() {
        return passthroughType ? [passthroughType] : [PassThrough]
      },

      get outputDataType() {
        return passthroughType ?? PassThrough
      },

      clearPassThroughDataType() {
        passthroughType = undefined
      },

      setPassThroughDataType(type: StepDataType) {
        passthroughType = type
      },
      serializeConfig() {
        // noop
      },
    } as unknown as IStepHandler<T>
  }

  isReady(store: MinStore) {
    if (!super.isReady(store)) return false

    return store.get(this.prevNodeId).outputReady()
  }

  childIds(store: MinStore): NodeId[] {
    const result = Object.values(store.nodes).find(n => n.prevNodeId === this.id)
    return result ? [result.id] : []
  }

  serialize(): BranchNodeSerialized<T> {
    return {
      ...super.serialize(),
      prevNodeId: this.prevNodeId,
      branchIndex: this.branchIndex,
    }
  }

  parentFork(store: MinStore): AnyForkNode {
    return store.get(this.prevNodeId) as AnyForkNode
  }

  async runner(store: MinStore) {
    const fork = this.parentFork(store)
    this.handler.setPassThroughDataType(fork.handler?.outputDataType)

    this.outputData = await this.getOutputDataFromPrev(store)
    this.outputPreview = null
    this.validationErrors = []
  }

  getOutput(): T['Output'] | null {
    return this.outputData
  }

  async getOutputDataFromPrev(store: MinStore) {
    logNodeEvent(this.id, 'getOutputDataFromPrev: start')

    const fork = this.parentFork(store)
    const result = await fork.getBranchOutput(store, this.branchIndex)
    const final = result?.output?.copy() ?? null
    logNodeEvent(this.id, 'getOutputDataFromPrev: end', final)
    return final
  }

  initialize(handlerOptions: StepHandlerOptions<T>): void {
    // noop
  }

  getOutputSize(): ImgSize {
    return {
      width: this?.outputData?.width ?? 0,
      height: this?.outputData?.height ?? 0,
    }
  }
}

export type AnyNode<T extends AnyStepContext = AnyStepContext> = StepNode<T> | ForkNode<T> | BranchNode<T>
export type GraphNode<T extends AnyStepContext> =
  | StepNode<T, NormalStepRunner<T>>
  | ForkNode<T, ForkStepRunner<T>>
  | BranchNode<T, NormalStepRunner<T>>

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

function parseResult<T extends AnyStepContext>(result: SingleRunnerOutput<T>): SingleRunnerResult<T> {
  return {
    output: result?.output ?? null,
    preview: result?.preview ?? null,
    validationErrors: result?.validationErrors ?? [],
  }
}

type Initialized<
  N extends BaseNode<any>,
  T extends AnyStepContext,
  R extends NodeRunner<T>
> =
  Omit<N, 'config' | 'handler'> & {
  config: NonNullable<N['config']>,
  handler: IStepHandler<T, R>,
}

export type InitializedStepNode<T extends AnyStepContext, R extends NodeRunner<T>> =
  Initialized<StepNode<T>, T, R> & {
  type: NodeType.STEP,
  outputData: T['Output'] | null
}

export type InitializedForkNode<T extends AnyStepContext, R extends NodeRunner<T>> =
  Initialized<ForkNode<T>, T, R> & {
  type: NodeType.FORK,
  outputData: T['Output'][]
}

export type InitializedBranchNode<T extends AnyStepContext, R extends NodeRunner<T>> =
  Initialized<BranchNode<T>, T, R> & {
  type: NodeType.BRANCH,
  outputData: T['Output'] | null
}

export type AnyInitializedNode = InitializedNode<AnyStepContext, NodeRunner<AnyStepContext>>

export type InitializedNormalNode<
  T extends AnyStepContext,
  R extends NodeRunner<T>
> =
  | InitializedStepNode<T, R>
  | InitializedBranchNode<T, R>

export type InitializedForkOnlyNode<
  T extends AnyStepContext,
  R extends NodeRunner<T>
> = InitializedForkNode<T, R>

export type InitializedNode<
  T extends AnyStepContext,
  R extends NodeRunner<T> = NodeRunner<T>
> =
  | InitializedStepNode<T, R>
  | InitializedForkNode<T, R>
  | InitializedBranchNode<T, R>

export function assertInitialized<T extends AnyStepContext, R extends NodeRunner<T>>(
  node: GraphNode<T>,
): asserts node is GraphNode<T> & { handler: IStepHandler<T, R>, config: NonNullable<GraphNode<T>['config']> } {
  if (!node.initialized || !node.handler || node.config === undefined) {
    throw new Error('Node not initialized')
  }
}

export const BRANCH_DEF = 'branch_node' as NodeDef

export const BRANCH_STEP_DEF = {
  type: NodeType.BRANCH,
  def: BRANCH_DEF,
  displayName: 'Branch',
  passthrough: true,
  component: {} as Component,
}