import { STEP_REGISTRY, type StepDataTypeInstance } from '../../steps.ts'
import type { StepValidationError } from '../errors.ts'
import type { PipelineStore } from '../store/pipeline-store.ts'
import type { AnyStepContext, StepLoaderSerialized } from './Step.ts'
import { type Config, type IStepHandler, makeStepHandler, type StepHandlerOptions } from './StepHandler.ts'
import type {
  ForkStepRunner,
  ForkStepRunnerOutput,
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

export type BaseNodeSerialized<T extends AnyStepContext> = {
  id: string,
  def: string,
  seed: number,
  muted: boolean,
  config: T['SerializedConfig']
}

export type BaseNodeOptions<T extends AnyStepContext> = {
  id: string,
  def: string,
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
  id: string
  def: string
  seed = 0
  muted: boolean = false
  config: T['RC'] | undefined

  // transient
  seedSum = 0
  outputData: T['Output'] | T['Output'][] | null = null
  outputPreview: ImageData | ImageData[] | null = null
  validationErrors: StepValidationError[] = []
  loadSerialized: StepLoaderSerialized<T['SerializedConfig']>
  handler: IStepHandler<T, R> | undefined

  // system
  isDirty = false
  isProcessing = false
  initialized = false
  lastExecutionTimeMS: undefined | number

  abstract prevNodeId: string | null

  constructor({ id, def, seed = 0, muted = false, config }: BaseNodeOptions<T>) {
    this.id = id
    this.def = def
    this.seed = seed
    this.muted = muted
    this.loadSerialized = { config }
  }

  abstract runner(store: PipelineStore): Promise<ReturnType<R>>

  isReady(store: PipelineStore): boolean {
    return !this.isProcessing
      && this.initialized
      && this.isDirty
  }

  outputReady(): boolean {
    return !this.isDirty
      && !this.isProcessing
      && this.initialized
  }

  async processRunner(store: PipelineStore) {
    this.isProcessing = true
    const startTime = performance.now()

    const result = await this.runner(store)

    this.isProcessing = false
    this.isDirty = false
    this.lastExecutionTimeMS = performance.now() - startTime

    return result
  }

  abstract childIds(store: PipelineStore): string[]

  serialize(): BaseNodeSerialized<T> {
    return {
      id: this.id,
      def: this.def,
      seed: this.seed,
      muted: this.muted,
      config: this.handler!.serializeConfig(this.config),
    }
  }

  abstract getInputDataFromPrev(store: PipelineStore): T['Input'] | null

  initialize(handlerOptions: StepHandlerOptions<T>) {
    const handler = makeStepHandler<T>(this.def, handlerOptions)

    this.handler = handler as IStepHandler<T, R>
    if (this.config === undefined) {
      this.config = handler.reactiveConfig(handler.config())
    }

    if (this.loadSerialized !== null) {
      handler.loadConfig(this.config as Config, this.loadSerialized.config)
      this.loadSerialized = null
    }
  }
}

type StepNodeProperties = {
  prevNodeId?: string | null,
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

  prevNodeId: string | null
  outputData: StepDataTypeInstance | null = null

  constructor(options: StepNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId ?? null
  }

  isReady(store: PipelineStore) {
    if (!super.isReady(store)) return false
    if (!this.prevNodeId) return true

    return store.get(this.prevNodeId).outputReady()
  }

  childIds(store: PipelineStore) {
    const result = Object.values(store.nodes).find(n => n.prevNodeId === this.id)
    return result ? [result.id] : []
  }

  serialize(): StepNodeSerialized<T> {
    return {
      ...super.serialize(),
      prevNodeId: this.prevNodeId,
    }
  }

  async runner(store: PipelineStore) {
    const output = await this.handler!.run({
      config: this.config as T['RC'],
      inputData: this.getInputDataFromPrev(store),
    })

    return parseResult(output) as ReturnType<R>
  }

  getInputDataFromPrev(store: PipelineStore): T['Input'] | null {
    if (!this.prevNodeId) return null

    const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
    return prev.outputData
  }
}

type ForkNodeProperties = {
  prevNodeId?: string | null,
  branchIds?: string[],
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
  branchIds: string[]
  prevNodeId: string | null
  outputData: T['Output'][] = []

  constructor(options: ForkNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId ?? null
    this.branchIds = options.branchIds ?? []
  }

  isReady(store: PipelineStore) {
    if (!super.isReady(store)) return false
    if (!this.prevNodeId) return true

    return store.get(this.prevNodeId).outputReady()
  }

  childIds(store: PipelineStore) {
    return this.branchIds
  }

  async runner(store: PipelineStore): Promise<
    ReturnType<R>
  > {
    const promises = new Array(this.branchIds.length).map(async (_v, i) => {
      return () => this.getBranchOutput(store, i)
    })

    return Promise.all(promises) as ReturnType<R>
  }

  async getBranchOutput(store: PipelineStore, branchIndex: number): Promise<SingleRunnerOutput<T>> {
    if (!this.outputData[branchIndex]) {
      this.outputData[branchIndex] = await this.runBranch(store, branchIndex)
    }
    return this.outputData[branchIndex]
  }

  protected async runBranch(store: PipelineStore, branchIndex: number): Promise<
    ForkStepRunnerOutput<T>
  > {
    return this.handler!.run({
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

  getInputDataFromPrev(store: PipelineStore): T['Input'] | null {
    if (!this.prevNodeId) return null

    const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
    return prev.outputData
  }
}

type BranchNodeProperties = {
  parentForkId: string,
  branchIndex: number,
  nextId?: string | null,
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
  parentForkId: string
  branchIndex: number
  nextId: string | null

  constructor(options: BranchNodeOptions<T>) {
    super(options)
    this.parentForkId = options.parentForkId
    this.branchIndex = options.branchIndex
    this.nextId = options.nextId ?? null
  }

  get prevNodeId() {
    return this.parentForkId
  }

  isReady(store: PipelineStore) {
    if (!super.isReady(store)) return false

    return store.get(this.parentForkId).outputReady()
  }

  childIds(store: PipelineStore): string[] {
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

  parentFork(store: PipelineStore): AnyForkNode {
    return store.get(this.parentForkId) as AnyForkNode
  }

  async runner(store: PipelineStore) {
    const output = await this.handler!.run({
      config: this.config as T['RC'],
      inputData: this.getInputDataFromPrev(store),
    })

    return parseResult(output) as ReturnType<R>
  }

  getOutput(): T['Output'] | null {
    return this.outputData
  }

  getInputDataFromPrev(store: PipelineStore): T['Input'] | null {
    return this.parentFork(store).getBranchOutput(store, this.branchIndex) as T['Input']
  }
}

export type AnyNode = AnyStepNode | AnyForkNode | AnyBranchNode
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