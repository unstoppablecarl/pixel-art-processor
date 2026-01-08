import { readonly, type Ref, ref } from 'vue'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { type ImgSize, logNodeEvent } from '../util/misc.ts'
import {
  type IRunnerResultMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type WatcherTarget,
  type WithRequired,
} from './_types.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import { type NormalStepRunner, parseResult, type SingleRunnerResult } from './NodeRunner.ts'
import type { AnyStepContext, StepLoaderSerialized } from './Step.ts'
import {
  type AnyINodeHandler,
  type BranchHandlerOptions,
  type ForkHandlerOptions,
  type IBranchHandler,
  type IForkHandler,
  type IStepHandler,
  makeBranchHandler,
  makeForkHandler,
  makeStepHandler,
  type StepHandlerOptions,
} from './StepHandler.ts'
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
  H extends AnyINodeHandler<T>,
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
  handler: H | undefined

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

  isReady(store: PipelineStore) {
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

  async processRunner(store: PipelineStore) {
    // await this.logFunction('processRunner', async () => {

    this.isProcessing = true
    const startTime = performance.now()

    await this.resolveRunner(store)

    this.isProcessing = false
    this.isDirty = false
    this.lastExecutionTimeMS = performance.now() - startTime
    // })
  }

  protected abstract resolveRunner(store: PipelineStore): Promise<void>

  abstract childIds(store: PipelineStore): NodeId[]

  abstract getOutputSize(): ImgSize

  abstract getOutputFromPrev(store: PipelineStore): Promise<SingleRunnerResult<any>>

  abstract getWatcherTargets(): WatcherTarget[]

  protected setPassThroughDataTypeFromPrev(store: PipelineStore): void {
    if (this.prevNodeId) {
      const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
      this.handler!.setPassThroughDataType(prev.handler!.outputDataType)
    } else {
      this.handler!.clearPassThroughDataType()
    }
  }

  serialize(): BaseNodeSerialized<T> {

    let config: T['SerializedConfig']
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

  protected initialize(handler: H): void {
    this.handler = handler

    if (!this.config) {
      this.config = handler.reactiveConfig(handler.config())
    }

    if (this.loadSerialized) {
      handler.loadConfig(this.config as T['RC'], this.loadSerialized.config)
      this.loadSerialized = null
    }
    this.initialized = true
  }

  getSeedSum(store: PipelineStore): number {
    this.seedSum = this.seed
    if (this.prevNodeId) {
      this.seedSum += store.get(this.prevNodeId).seedSum
    }
    return this.seedSum
  }

  protected getBaseWatcherTargets(): WatcherTarget[] {
    return [
      {
        name: 'config',
        target: () => this.config,
      },
      {
        name: 'seed',
        target: () => this.seed,
      },
    ]
  }

  protected async logFunction<T>(func: string, cb: () => Promise<T>): Promise<T> {
    logNodeEvent(this.id, `[${this.type}] ${func}: start`)
    const result = await cb()
    logNodeEvent(this.id, `[${this.type}] ${func}: end`, result)
    return result
  }

  getPrev(store: PipelineStore): PrevNode | undefined {
    if (!this.prevNodeId) return
    return store.get(this.prevNodeId) as PrevNode
  }
}

type AbstractConstructor = abstract new (...args: any[]) => any

function WithStepOrFork<TBase extends AbstractConstructor>(Base: TBase) {
  abstract class StepOrForkNode extends Base {
    async getOutputFromPrev(store: PipelineStore): Promise<SingleRunnerResult<any>> {
      if (!this.prevNodeId) {
        return parseResult(null)
      }

      const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode

      return parseResult({
        output: prev.outputData,
        meta: prev.outputMeta,
        preview: prev.outputPreview,
        validationErrors: prev.validationErrors,
      })
    }
  }

  return StepOrForkNode
}

abstract class StepOrBranchNode<
  T extends AnyStepContext,
  H extends IStepHandler<T> | IBranchHandler<T>,
  PrevNode extends AnyNode
> extends BaseNode<T, H, PrevNode> {
  outputData: T['Output'] | null = null
  outputPreview: ImageData | null = null
  outputMeta: IRunnerResultMeta = {}

  childIds(store: PipelineStore): NodeId[] {
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

type StepNodeProperties = {
  muted: boolean
}
export type AnyStepNodeSerialized = StepNodeSerialized<AnyStepContext>
export type StepNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & StepNodeProperties
export type AnyStepNode = StepNode<AnyStepContext>
export type StepNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & Partial<StepNodeProperties>

const StepBase = WithStepOrFork(StepOrBranchNode)

export class StepNode<T extends AnyStepContext> extends StepBase<T, IStepHandler<T>, AnyForkNode | AnyStepNode> {
  type = NodeType.STEP

  muted: boolean

  constructor(options: StepNodeOptions<T>) {
    super(options)
    this.muted = options.muted ?? false
  }

  serialize(): StepNodeSerialized<T> {
    return {
      ...super.serialize(),
      muted: this.muted,
      prevNodeId: this.prevNodeId,
    }
  }

  async runRaw(options: Parameters<NormalStepRunner<T>>[0]): Promise<SingleRunnerResult<T>> {
    return this.logFunction('step.run', async () => parseResult(
      await this.handler!.run(readonly(options)),
    ))
  }

  protected async resolveRunner(store: PipelineStore) {
    await this.logFunction('resolveRunner', async () => {

      if (this.muted) {
        const { output, meta } = await this.getOutputFromPrev(store)

        this.outputData = output
        this.outputPreview = null
        this.validationErrors = []
        this.outputMeta = meta

        this.setPassThroughDataTypeFromPrev(store)
        return
      } else {
        if (store.nodeIsPassthrough(this)) {
          this.setPassThroughDataTypeFromPrev(store)
        } else {
          this.handler!.clearPassThroughDataType()
        }
      }

      const { output: inputData, meta } = await this.getOutputFromPrev(store)

      const result = await this.runRaw({
        config: this.config as T['RC'],
        inputData,
        meta,
      })
      this.outputData = result.output
      this.outputPreview = result.preview
      this.validationErrors = result.validationErrors
      this.outputMeta = result.meta
    })
  }

  getWatcherTargets(): WatcherTarget[] {
    const defaults = [...super.getBaseWatcherTargets(), {
      name: 'muted',
      target: () => this.muted,
    }]
    return this.handler!.watcherTargets(this as InitializedStepNode<T>, defaults)
  }

  initializeStep(options: StepHandlerOptions<T>) {
    const handler = makeStepHandler<T>(this.def, options)
    this.initialize(handler)
  }
}

type ForkNodeProperties = {
  prevNodeId?: NodeId | null,
  branchIds?: NodeId[],
}
export type AnyForkNodeSerialized = ForkNodeSerialized<AnyStepContext>
export type ForkNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & Required<ForkNodeProperties>
export type AnyForkNode = ForkNode<AnyStepContext>
export type ForkNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & ForkNodeProperties

const ForkBase = WithStepOrFork(BaseNode)

export class ForkNode<
  T extends AnyStepContext,
> extends ForkBase<T, IForkHandler<T>, AnyStepNode | AnyBranchNode> {
  type = NodeType.FORK

  branchIds: Ref<NodeId[]> = ref<NodeId[]>([])
  forkOutputData: Ref<(SingleRunnerResult<T> | undefined)[]> = ref([])

  constructor(options: ForkNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId ?? null
    this.branchIds.value = options.branchIds ?? []
  }

  childIds(_store: PipelineStore) {
    return this.branchIds.value
  }

  protected async resolveRunner(store: PipelineStore) {
    if (store.nodeIsPassthrough(this)) {
      this.setPassThroughDataTypeFromPrev(store)
    }

    this.forkOutputData.value = await Promise.all(
      this.branchIds.value.map((_, i) => {
        return this.runBranch(store, i)
      }),
    ) as SingleRunnerResult<T>[]
  }

  async getBranchOutput(store: PipelineStore, branchIndex: number): Promise<SingleRunnerResult<T>> {
    if (this.forkOutputData.value[branchIndex] === undefined) {
      this.forkOutputData.value[branchIndex] = await this.runBranch(store, branchIndex)
      // trigger reactivity
      this.forkOutputData.value = [...this.forkOutputData.value]
    }

    return this.forkOutputData.value[branchIndex] as SingleRunnerResult<T>
  }

  // use when fork output data changes for only a specific branch
  markBranchDirty(store: PipelineStore, branchIndex: number): void {
    this.forkOutputData.value[branchIndex] = undefined
    const branchId = this.branchIds.value[branchIndex]
    store.markDirty(branchId)
  }

  private async runBranch(store: PipelineStore, branchIndex: number): Promise<
    SingleRunnerResult<T>
  > {
    return this.logFunction('runBranch', async () => {
      const { output: prevOutput, meta } = await this.getOutputFromPrev(store)
      const output = await this.handler!.run(readonly({
        config: this.config as T['RC'],
        inputData: prevOutput,
        branchIndex,
        meta,
      }))

      return parseResult<T>(output)
    })
  }

  serialize(): ForkNodeSerialized<T> {
    return {
      ...super.serialize(),
      prevNodeId: this.prevNodeId,
      branchIds: this.branchIds.value,
    }
  }

  getOutputSize(): ImgSize {
    const first = this.forkOutputData.value[0]?.output
    return {
      width: first?.width ?? 0,
      height: first?.height ?? 0,
    }
  }

  removeBranch(store: PipelineStore, branchId: NodeId): void {
    const index = this.branchIds.value.indexOf(branchId)
    if (index !== -1) {
      this.branchIds.value.splice(index, 1)
      // reindex remaining branches
      this.branchIds.value.forEach((bid, i) => {
        const b = store.get(bid) as AnyBranchNode
        b.branchIndex = i
      })
      this.forkOutputData.value.splice(index, 1)
    }
  }

  getWatcherTargets(): WatcherTarget[] {
    return this.handler!.watcherTargets(this as InitializedForkNode<T>, super.getBaseWatcherTargets())
  }

  initializeFork(options: ForkHandlerOptions<T>) {
    const handler = makeForkHandler<T>(this.def, options)
    this.initialize(handler)
  }
}

type BranchNodeProperties = {
  prevNodeId: NodeId,
  branchIndex: number,
}
export type AnyBranchNodeSerialized = BranchNodeSerialized<AnyStepContext>
export type BranchNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & Required<BranchNodeProperties>
export type AnyBranchNode = BranchNode<AnyStepContext>
export type BranchNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & BranchNodeProperties

export class BranchNode<T extends AnyStepContext> extends StepOrBranchNode<T, IBranchHandler<T>, AnyForkNode> {
  type = NodeType.BRANCH

  prevNodeId: NodeId
  branchIndex: number

  forkValidationErrors: StepValidationError[] = []

  constructor(options: BranchNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId
    this.branchIndex = options.branchIndex
  }

  serialize(): BranchNodeSerialized<T> {
    return {
      ...super.serialize(),
      prevNodeId: this.prevNodeId,
      branchIndex: this.branchIndex,
    }
  }

  getPrev(store: PipelineStore): AnyForkNode {
    return store.get(this.prevNodeId) as AnyForkNode
  }

  protected async resolveRunner(store: PipelineStore) {
    await this.logFunction('resolveRunner', async () => {
      const fork = this.getPrev(store)
      this.handler!.setPassThroughDataType(fork.handler!.outputDataType)

      const { output: inputData, meta, validationErrors: forkValidationErrors } = await this.getOutputFromPrev(store)

      const output = await this.handler!.run({
        config: this.config as T['RC'],
        inputData,
        meta,
      })

      const result = parseResult<T>(output)
      this.outputData = result.output
      this.outputPreview = result.preview
      this.validationErrors = result.validationErrors
      this.outputMeta = result.meta
      this.forkValidationErrors = forkValidationErrors
    })
  }

  async getOutputFromPrev(store: PipelineStore): Promise<SingleRunnerResult<T>> {
    // return this.logFunction('getOutputFromPrev', async () => {
    const fork = this.getPrev(store)
    const result = await fork.getBranchOutput(store, this.branchIndex)
    return result as SingleRunnerResult<T>
    // })
  }

  getWatcherTargets(): WatcherTarget[] {
    return this.handler!.watcherTargets(this as InitializedBranchNode<T>, super.getBaseWatcherTargets())
  }

  initializeBranch(options: BranchHandlerOptions<T>) {
    const handler = makeBranchHandler<T>(this.def, options)
    this.initialize(handler)
  }

  getSiblings(store: PipelineStore, filter?: (siblingBranch: AnyBranchNode) => boolean): AnyBranchNode[] {
    const fork = this.getPrev(store)
    const siblings = fork.branchIds.value.map(store.getBranch)

    if (filter) {
      return siblings.filter(filter)
    }
    return siblings
  }
}

export type AnyNode<T extends AnyStepContext = AnyStepContext> = StepNode<T> | ForkNode<T> | BranchNode<T>
export type GraphNode<T extends AnyStepContext> =
  | StepNode<T>
  | ForkNode<T>
  | BranchNode<T>

export type InitializedStepNode<T extends AnyStepContext> = { __brand: 'step' }
  & WithRequired<StepNode<T>, 'config' | 'handler'>
export type InitializedForkNode<T extends AnyStepContext> = { __brand: 'fork' }
  & WithRequired<ForkNode<T>, 'config' | 'handler'>
export type InitializedBranchNode<T extends AnyStepContext> = { __brand: 'branch' }
  & WithRequired<BranchNode<T>, 'config' | 'handler'>

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
