import { STEP_REGISTRY } from '../../steps.ts'
import type { StepValidationError } from '../errors.ts'
import type { MinStore } from '../store/pipeline-store.ts'
import type { AnyStepContext, StepLoaderSerialized } from './Step.ts'
import { type IStepHandler } from './StepHandler.ts'
import type {
  ForkStepRunner,
  NormalStepRunner,
  SingleRunnerOutput,
  SingleRunnerResult,
  StepRunner,
} from './StepRunner.ts'

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
  muted: boolean,
  config: T['SerializedConfig']
}

export type BaseNodeOptions<T extends AnyStepContext> = {
  id: NodeId,
  def: NodeDef,
  seed?: number,
  muted?: boolean,
  config?: T['SerializedConfig'],
}

export abstract class BaseNode<
  T extends AnyStepContext,
  R extends StepRunner<T> = StepRunner<T>
> {
  readonly abstract type: NodeType
  // serialized
  id: NodeId
  def: NodeDef
  seed = 0
  muted: boolean = false
  config: T['RC'] | undefined

  // transient
  seedSum = 0
  outputData: T['Output'] | T['Output'][] | null = null
  outputPreview: ImageData | ImageData[] | null = null
  validationErrors: StepValidationError[] = []
  loadSerialized: StepLoaderSerialized<T['SerializedConfig']>
  handler: IStepHandler<T> | undefined

  // system
  isDirty = false
  isProcessing = false
  initialized = false
  lastExecutionTimeMS: undefined | number

  abstract prevNodeId: NodeId | null

  constructor({ id, def, seed = 0, muted = false, config }: BaseNodeOptions<T>) {
    this.id = id
    this.def = def
    this.seed = seed
    this.muted = muted
    this.loadSerialized = { config }
  }

  abstract runner(store: MinStore): void

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
    this.isProcessing = true
    const startTime = performance.now()

    const result = await this.runner(store)

    this.isProcessing = false
    this.isDirty = false
    this.lastExecutionTimeMS = performance.now() - startTime

    return result
  }

  abstract childIds(store: MinStore): string[]

  serialize(): BaseNodeSerialized<T> {
    return {
      id: this.id,
      def: this.def,
      seed: this.seed,
      muted: this.muted,
      config: this.handler!.serializeConfig(this.config),
    }
  }

  abstract getInputDataFromPrev(store: MinStore): Promise<T['Input'] | null>
}

type StepNodeProperties = {
  prevNodeId?: NodeId | null,
}
export type AnyStepNodeSerialized = StepNodeSerialized<AnyStepContext>
export type StepNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & StepNodeProperties
export type AnyStepNode = StepNode<AnyStepContext>
export type StepNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & StepNodeProperties

export class StepNode<
  T extends AnyStepContext,
  R extends NormalStepRunner<T> = NormalStepRunner<T>
> extends BaseNode<T, R> {
  type = NodeType.STEP

  prevNodeId: NodeId | null
  outputData: T['Output'] | null = null

  constructor(options: StepNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId ?? null
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
      prevNodeId: this.prevNodeId,
    }
  }

  async runner(store: MinStore) {
    const _handler = this.handler as IStepHandler<T, R>
    const output = await _handler.run({
      config: this.config as T['RC'],
      inputData: this.getInputDataFromPrev(store),
    })

    return parseResult<T>(output)
  }

  async getInputDataFromPrev(store: MinStore): Promise<T['Input'] | null> {
    if (!this.prevNodeId) return null

    const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
    return prev.outputData
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
  branchIds: NodeId[]
  prevNodeId: NodeId | null
  outputData: SingleRunnerOutput<T>[] = []

  constructor(options: ForkNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId ?? null
    this.branchIds = options.branchIds ?? []
  }

  isReady(store: MinStore) {
    if (!super.isReady(store)) return false
    if (!this.prevNodeId) return true

    return store.get(this.prevNodeId).outputReady()
  }

  childIds(store: MinStore) {
    return this.branchIds
  }

  async runner(store: MinStore) {
    this.outputData = await Promise.all(
      this.branchIds.map((_, i) => this.getBranchOutput(store, i)),
    ) as SingleRunnerOutput<T>[]
  }

  async getBranchOutput(store: MinStore, branchIndex: number): Promise<SingleRunnerOutput<T>> {
    if (!this.outputData[branchIndex] === undefined) {
      this.outputData[branchIndex] = await this.runBranch(store, branchIndex)
    }
    return this.outputData[branchIndex]
  }

  protected async runBranch(store: MinStore, branchIndex: number): Promise<
    SingleRunnerOutput<T>
  > {
    const _handler = this.handler as IStepHandler<T, R>
    return _handler.run({
      config: this.config as T['RC'],
      inputData: this.getInputDataFromPrev(store),
      branchIndex,
    })
  }

  serialize(): ForkNodeSerialized<T> {
    return {
      ...super.serialize(),
      prevNodeId: this.prevNodeId,
      branchIds: this.branchIds,
    }
  }

  async getInputDataFromPrev(store: MinStore): Promise<T['Input'] | null> {
    if (!this.prevNodeId) return null

    const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
    return prev.outputData
  }
}

type BranchNodeProperties = {
  parentForkId: NodeId,
  branchIndex: number,
  nextId?: NodeId | null,
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
  parentForkId: NodeId
  branchIndex: number
  nextId: NodeId | null

  constructor(options: BranchNodeOptions<T>) {
    super(options)
    this.parentForkId = options.parentForkId
    this.branchIndex = options.branchIndex
    this.nextId = options.nextId ?? null
  }

  get prevNodeId() {
    return this.parentForkId
  }

  set prevNodeId(val: NodeId) {
    this.parentForkId = val
  }

  isReady(store: MinStore) {
    if (!super.isReady(store)) return false

    return store.get(this.parentForkId).outputReady()
  }

  childIds(store: MinStore): NodeId[] {
    return this.nextId ? [this.nextId] : []
  }

  serialize(): BranchNodeSerialized<T> {
    return {
      ...super.serialize(),
      parentForkId: this.parentForkId,
      branchIndex: this.branchIndex,
      nextId: this.nextId,
    }
  }

  parentFork(store: MinStore): AnyForkNode {
    return store.get(this.parentForkId) as AnyForkNode
  }

  async runner(store: MinStore) {
    const _handler = this.handler as IStepHandler<T, R>
    const output = await _handler.run({
      config: this.config as T['RC'],
      inputData: this.getInputDataFromPrev(store),
    })

    return parseResult(output) as ReturnType<R>
  }

  getOutput(): T['Output'] | null {
    return this.outputData
  }

  async getInputDataFromPrev(store: MinStore) {
    return this.parentFork(store).getBranchOutput(store, this.branchIndex) as T['Input']
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

export const isStep = (n: AnyNode): n is AnyStepNode => STEP_REGISTRY.getNodeType(n.def) === NodeType.STEP
export const isFork = (n: AnyNode): n is AnyForkNode => STEP_REGISTRY.getNodeType(n.def) === NodeType.FORK
export const isBranch = (n: AnyNode): n is AnyBranchNode => STEP_REGISTRY.getNodeType(n.def) === NodeType.BRANCH

const isStepSerialized = (n: AnyNodeSerialized): n is AnyStepNodeSerialized => STEP_REGISTRY.getNodeType(n.def) === NodeType.STEP
const isForkSerialized = (n: AnyNodeSerialized): n is AnyForkNodeSerialized => STEP_REGISTRY.getNodeType(n.def) === NodeType.FORK
const isBranchSerialized = (n: AnyNodeSerialized): n is AnyBranchNodeSerialized => STEP_REGISTRY.getNodeType(n.def) === NodeType.BRANCH

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
  R extends StepRunner<T>
> =
  Omit<N, 'config' | 'handler'> & {
  config: NonNullable<N['config']>,
  handler: IStepHandler<T, R>,
}

export type InitializedStepNode<T extends AnyStepContext, R extends StepRunner<T>> =
  Initialized<StepNode<T>, T, R> & {
  type: NodeType.STEP,
  outputData: T['Output'] | null
}

export type InitializedForkNode<T extends AnyStepContext, R extends StepRunner<T>> =
  Initialized<ForkNode<T>, T, R> & {
  type: NodeType.FORK,
  outputData: T['Output'][]
}

export type InitializedBranchNode<T extends AnyStepContext, R extends StepRunner<T>> =
  Initialized<BranchNode<T>, T, R> & {
  type: NodeType.BRANCH,
  outputData: T['Output'] | null
}

export type AnyInitializedNode = InitializedNode<AnyStepContext, StepRunner<AnyStepContext>>

export type InitializedNormalNode<
  T extends AnyStepContext,
  R extends StepRunner<T>
> =
  | InitializedStepNode<T, R>
  | InitializedBranchNode<T, R>

export type InitializedForkOnlyNode<
  T extends AnyStepContext,
  R extends StepRunner<T>
> = InitializedForkNode<T, R>

export type InitializedNode<
  T extends AnyStepContext,
  R extends StepRunner<T> = StepRunner<T>
> =
  | InitializedStepNode<T, R>
  | InitializedForkNode<T, R>
  | InitializedBranchNode<T, R>
