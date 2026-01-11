import { ref, type Ref } from 'vue'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { type ImgSize, logNodeEvent } from '../util/misc.ts'
import {
  type AnyStepMeta,
  type IRunnerResultMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type WatcherTarget,
  type WithRequired,
} from './_types.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import {
  type ForkRunner,
  type NodeRunner,
  type NormalRunner,
  parseResult,
  type SingleRunnerResult,
} from './NodeRunner.ts'
import type { AnyStepContext, StepLoaderSerialized } from './Step.ts'
import { type IStepHandler } from './StepHandler.ts'
import { useStepRegistry } from './StepRegistry.ts'

export type BaseNodeSerialized<T extends AnyStepContext> = {
  id: NodeId,
  def: NodeDef,
  seed: number,
  visible: boolean,
  config: T['SC'],
  prevNodeId?: NodeId | null,
}

export type BaseNodeOptions<T extends AnyStepContext> = {
  id: NodeId,
  def: NodeDef,
  seed?: number,
  visible?: boolean,
  config?: T['SC'],
  prevNodeId?: NodeId | null,
}

export abstract class BaseNode<
  M extends AnyStepMeta,
  T extends AnyStepContext,
  R extends NodeRunner<T>,
  N extends InitializedNode<M, T>,
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
  loadSerialized: StepLoaderSerialized<T['SC']> = null
  handler: IStepHandler<M, T, R> | undefined

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

  abstract getResultFromPrev(store: PipelineStore): Promise<SingleRunnerResult<any>>

  abstract getWatcherTargets(): WatcherTarget[]

  protected setPassThroughDataTypeFromPrev(store: PipelineStore): void {
    if (this.prevNodeId) {
      const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode
      this.handler!.setPassThroughDataType(prev.handler!.currentOutputDataType)
    } else {
      this.handler!.clearPassThroughDataType()
    }
  }

  serialize(): BaseNodeSerialized<T> {

    let config: T['SC']
    if (this.handler) {
      config = this.handler.serializeConfig(this.config!)
    } else {
      config = this.loadSerialized?.config as T['SC']
    }

    return {
      id: this.id,
      def: this.def,
      seed: this.seed,
      visible: this.visible,
      config: config,
    }
  }

  initialize(handler: IStepHandler<M, T>): void {

    this.handler = handler as IStepHandler<M, T, R>

    if (this.config === undefined) {
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

  validatePrev(prevOutput: SingleRunnerResult<any>['output']): StepValidationError[] {
    if (!prevOutput) return []
    return this.handler!.validateInput(prevOutput, this.handler!.currentInputDataTypes)
  }
}

type AbstractConstructor = abstract new (...args: any[]) => any

function WithStepOrFork<TBase extends AbstractConstructor>(Base: TBase) {
  abstract class StepOrForkNode extends Base {
    async getResultFromPrev(store: PipelineStore): Promise<SingleRunnerResult<any>> {
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
  M extends AnyStepMeta,
  T extends AnyStepContext,
  N extends InitializedStepNode<M, T> | InitializedBranchNode<M, T>,
  PrevNode extends AnyNode
> extends BaseNode<M, T, NormalRunner<T>, N, PrevNode> {
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
export type AnyStepNode = StepNode<any, any>
export type StepNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & Partial<StepNodeProperties>

const StepBase = WithStepOrFork(StepOrBranchNode)

export class StepNode<
  M extends AnyStepMeta,
  T extends AnyStepContext,
  N extends InitializedStepNode<M, T> = InitializedStepNode<M, T>
> extends StepBase<M, T, N, AnyForkNode | AnyStepNode> {
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

  async runRaw(options: Parameters<NormalRunner<T>>[0]): Promise<SingleRunnerResult<T>> {
    return this.logFunction('step.run', async () => parseResult(
      await this.handler!.run(options),
    ))
  }

  protected async resolveRunner(store: PipelineStore) {
    await this.logFunction('resolveRunner', async () => {

      if (this.muted) {
        const { output, meta } = await this.getResultFromPrev(store)

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

      let {
        output: inputData,
        preview: inputPreview,
        meta,
      } = await this.getResultFromPrev(store)

      const validationErrors = this.validatePrev(inputData)
      if (validationErrors.length) {
        inputData = null
        inputPreview = null
        meta = null
      }

      const result = await this.runRaw({
        config: this.config as T['RC'],
        inputData,
        inputPreview,
        meta,
      })
      this.outputData = result.output
      this.outputPreview = result.preview
      this.validationErrors = [...result.validationErrors, ...validationErrors]
      this.outputMeta = result.meta ?? meta
    })
  }

  getWatcherTargets(): WatcherTarget[] {
    const defaults = [...super.getBaseWatcherTargets(), {
      name: 'muted',
      target: () => this.muted,
    }]
    return this.handler!.watcherTargets(this as unknown as N, defaults)
  }
}

type ForkNodeProperties = {
  prevNodeId?: NodeId | null,
  branchIds?: NodeId[],
}
export type AnyForkNodeSerialized = ForkNodeSerialized<AnyStepContext>
export type ForkNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & Required<ForkNodeProperties>
export type AnyForkNode = ForkNode<any, any>
export type ForkNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & ForkNodeProperties

const ForkBase = WithStepOrFork(BaseNode)

export class ForkNode<M extends AnyStepMeta, T extends AnyStepContext> extends ForkBase<M, T, ForkRunner<T>, InitializedForkNode<M, T>, AnyStepNode | AnyBranchNode> {
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

  getCachedBranchOutput(branchIndex: number): SingleRunnerResult<T> | null {
    return this.forkOutputData.value[branchIndex] ?? null
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
      const {
        output: inputData,
        preview: inputPreview,
        meta,
      } = await this.getResultFromPrev(store)

      const output = await this.handler!.run({
        config: this.config as T['RC'],
        inputData,
        inputPreview,
        branchIndex,
        meta,
      })

      output.meta ??= meta

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
    return this.handler!.watcherTargets(this as InitializedForkNode<M, T>, super.getBaseWatcherTargets())
  }
}

type BranchNodeProperties = {
  prevNodeId: NodeId,
  branchIndex: number,
}
export type AnyBranchNodeSerialized = BranchNodeSerialized<AnyStepContext>
export type BranchNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & Required<BranchNodeProperties>
export type AnyBranchNode = BranchNode<any, any>
export type BranchNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & BranchNodeProperties

export class BranchNode<M extends AnyStepMeta, T extends AnyStepContext> extends StepOrBranchNode<M, T, InitializedBranchNode<M, T>, AnyForkNode> {
  type = NodeType.BRANCH

  prevNodeId: NodeId
  branchIndex: number

  forkPreview: ImageData | null
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
      this.handler!.setPassThroughDataType(fork.handler!.currentOutputDataType)

      let {
        output: inputData,
        preview: inputPreview,
        meta,
        validationErrors: forkValidationErrors,
      } = await this.getResultFromPrev(store)

      this.forkPreview = inputPreview
      logNodeEvent(this.id, 'resolveRunner: input', {
        config: this.config as T['RC'],
        inputData,
        inputPreview,
        meta,
      } as any)

      const validationErrors = this.validatePrev(inputData)
      if (validationErrors.length) {
        inputData = null
        inputPreview = null
        meta = null
      }

      const output = await this.handler!.run({
        config: this.config as T['RC'],
        inputData,
        inputPreview,
        meta,
      })

      const result = parseResult<T>(output)

      this.outputData = result.output
      this.outputPreview = result.preview
      this.validationErrors = [...result.validationErrors, ...validationErrors]
      this.outputMeta = result.meta ?? meta
      this.forkValidationErrors = forkValidationErrors
    })
  }

  async getResultFromPrev(store: PipelineStore): Promise<SingleRunnerResult<T>> {
    // return this.logFunction('getResultFromPrev', async () => {
    const fork = this.getPrev(store)
    const result = await fork.getBranchOutput(store, this.branchIndex)
    return result as SingleRunnerResult<T>
    // })
  }

  getWatcherTargets(): WatcherTarget[] {
    return this.handler!.watcherTargets(this as InitializedBranchNode<M, T>, super.getBaseWatcherTargets())
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

export type AnyNode<M extends AnyStepMeta = AnyStepMeta, T extends AnyStepContext = AnyStepContext> =
  | StepNode<M, T>
  | ForkNode<M, T>
  | BranchNode<M, T>

export type InitializedStepNode<M extends AnyStepMeta, T extends AnyStepContext> = { __brand: 'step' }
  & WithRequired<StepNode<M, T>, 'config' | 'handler'>
export type InitializedForkNode<M extends AnyStepMeta, T extends AnyStepContext> = { __brand: 'fork' }
  & WithRequired<ForkNode<M, T>, 'config' | 'handler'>
export type InitializedBranchNode<M extends AnyStepMeta, T extends AnyStepContext> = { __brand: 'branch' }
  & WithRequired<BranchNode<M, T>, 'config' | 'handler'>

export type InitializedNode<M extends AnyStepMeta, T extends AnyStepContext> =
  | InitializedStepNode<M, T>
  | InitializedForkNode<M, T>
  | InitializedBranchNode<M, T>

export type AnyInitializedNode = InitializedNode<any, any>
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

export const isStep = (n: AnyNode | AnyInitializedNode): n is StepNode<any, any> => useStepRegistry().getNodeType(n.def) === NodeType.STEP
export const isFork = (n: AnyNode | AnyInitializedNode): n is ForkNode<any, any> => useStepRegistry().getNodeType(n.def) === NodeType.FORK
export const isBranch = (n: AnyNode | AnyInitializedNode): n is BranchNode<any, any> => useStepRegistry().getNodeType(n.def) === NodeType.BRANCH

const isStepSerialized = (n: AnyNodeSerialized): n is AnyStepNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.STEP
const isForkSerialized = (n: AnyNodeSerialized): n is AnyForkNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.FORK
const isBranchSerialized = (n: AnyNodeSerialized): n is AnyBranchNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.BRANCH
