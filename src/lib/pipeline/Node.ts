import { ref, type Ref } from 'vue'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { type ImgSize, logNodeEvent } from '../util/misc.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import {
  type AnyStepMeta,
  type IRunnerResultMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type NormalizedConfig,
  type StepDataType,
  type StepDataTypeInstance,
  type StepInputTypesToInstances,
  type StepLoaderSerialized,
  type StepMeta,
  type WatcherTarget,
  type WithRequired,
} from './_types.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import type { BranchHandler } from './NodeHandler/BranchHandler.ts'
import type { ForkHandler } from './NodeHandler/ForkHandler.ts'
import type { StepHandler } from './NodeHandler/StepHandler.ts'
import { type NormalRunner, parseResult, type SingleRunnerResult } from './NodeRunner.ts'
import { useStepRegistry } from './StepRegistry.ts'

export type BaseNodeSerialized<SC> = {
  id: NodeId,
  def: NodeDef,
  seed: number,
  visible: boolean,
  config: SC,
  prevNodeId?: NodeId | null,
}

export type BaseNodeOptions<SC> = {
  id: NodeId,
  def: NodeDef,
  seed?: number,
  visible?: boolean,
  config?: SC,
  prevNodeId?: NodeId | null,
}

export abstract class BaseNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
  PrevNode extends AnyNode = AnyNode
> {
  readonly abstract type: NodeType
  // serialized
  id: NodeId
  def: NodeDef
  seed = 0
  config: RC | undefined
  visible = true
  prevNodeId: NodeId | null

  // transient
  seedSum = 0
  validationErrors: StepValidationError[] = []
  loadSerialized: StepLoaderSerialized<SC> = null
  abstract handler: StepHandler<C, SC, RC, I, O> | ForkHandler<C, SC, RC, I, O> | BranchHandler<C, SC, RC, I, O> | undefined

  // system
  isDirty = false
  isProcessing = false
  initialized = false
  lastExecutionTimeMS: undefined | number

  constructor({ id, def, seed = 0, visible = true, config, prevNodeId = null }: BaseNodeOptions<SC>) {
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

  serialize(): BaseNodeSerialized<SC> {

    let config: SC
    if (this.handler) {
      const unwrapped = deepUnwrap(this.config!)
      config = this.handler.serializeConfig(unwrapped as NormalizedConfig<C>)
    } else {
      config = this.loadSerialized?.config as SC
    }

    return {
      id: this.id,
      def: this.def,
      seed: this.seed,
      visible: this.visible,
      config: config,
    }
  }

  initialize(handler: StepHandler<C, SC, RC, I, O> | ForkHandler<C, SC, RC, I, O> | BranchHandler<C, SC, RC, I, O>): void {

    this.handler = handler

    if (this.config === undefined) {
      this.config = handler.reactiveConfig(handler.config()) as RC
    }

    if (this.loadSerialized) {
      handler.loadConfig(this.config as RC, this.loadSerialized.config)
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
    return this.handler!.validateInput(prevOutput, this.handler!.currentInputDataTypes as I)
  }
}

type AbstractConstructor = abstract new (...args: any[]) => any

function WithStepOrFork<TBase extends AbstractConstructor>(Base: TBase) {
  abstract class StepOrForkNode extends Base {
    async getResultFromPrev(store: PipelineStore): Promise<SingleRunnerResult<any>> {
      if (!this.prevNodeId) {
        return parseResult(null, null)
      }

      const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode

      return parseResult({
        output: prev.outputData,
        meta: prev.outputMeta,
        preview: prev.outputPreview,
        validationErrors: prev.validationErrors,
      }, prev.outputMeta)
    }
  }

  return StepOrForkNode
}

abstract class StepOrBranchNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
  PrevNode extends AnyNode = AnyNode
> extends BaseNode<C, SC, RC, I, O, M, PrevNode> {
  outputData: InstanceType<O> | null = null
  outputPreview: ImageData | null = null
  outputMeta: IRunnerResultMeta | null = null

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
export type AnyStepNodeSerialized = StepNodeSerialized<any>
export type StepNodeSerialized<SC> = BaseNodeSerialized<SC> & StepNodeProperties
export type AnyStepNode = StepNode<any, any, any, any, any, any>
export type StepNodeOptions<SC> = BaseNodeOptions<SC> & Partial<StepNodeProperties>

const StepBase = WithStepOrFork(StepOrBranchNode)

export class StepNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
  N extends InitializedStepNode<C, SC, RC, I, O, M> = InitializedStepNode<C, SC, RC, I, O, M>
> extends StepBase<C, SC, RC, I, O, M, AnyForkNode | AnyStepNode> {

  type = NodeType.STEP

  muted: boolean
  handler: StepHandler<C, SC, RC, I, O> | undefined

  constructor(options: StepNodeOptions<SC>) {
    super(options)
    this.muted = options.muted ?? false
  }

  serialize(): StepNodeSerialized<SC> {
    return {
      ...super.serialize(),
      muted: this.muted,
      prevNodeId: this.prevNodeId,
    }
  }

  async runRaw(options: Parameters<NormalRunner<
    StepInputTypesToInstances<I>,
    InstanceType<O>,
    RC
  >
  >[0]): Promise<SingleRunnerResult<InstanceType<O>>> {
    return this.logFunction('step.run', async () => parseResult<InstanceType<O>>(
      await this.handler!.run(options),
      options?.meta ?? null,
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
        config: this.config as RC,
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
export type AnyForkNodeSerialized = ForkNodeSerialized<any>
export type ForkNodeSerialized<SC> = BaseNodeSerialized<SC> & Required<ForkNodeProperties>
export type AnyForkNode = ForkNode<any, any, any, any, any, any>
export type ForkNodeOptions<SC> = BaseNodeOptions<SC> & ForkNodeProperties

const ForkBase = WithStepOrFork(BaseNode)

export class ForkNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
> extends ForkBase<C, SC, RC, I, O, M, AnyStepNode | AnyBranchNode> {
  type = NodeType.FORK

  handler: ForkHandler<C, SC, RC, I, O> | undefined
  branchIds: Ref<NodeId[]> = ref<NodeId[]>([])
  forkOutputData: Ref<(SingleRunnerResult<InstanceType<O>> | undefined)[]> = ref([])

  constructor(options: ForkNodeOptions<SC>) {
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
    ) as SingleRunnerResult<InstanceType<O>>[]
  }

  getCachedBranchOutput(branchIndex: number): SingleRunnerResult<InstanceType<O>> | null {
    return this.forkOutputData.value[branchIndex] ?? null
  }

  async getBranchOutput(store: PipelineStore, branchIndex: number): Promise<SingleRunnerResult<InstanceType<O>>> {
    if (this.forkOutputData.value[branchIndex] === undefined) {
      this.forkOutputData.value[branchIndex] = await this.runBranch(store, branchIndex)
      // trigger reactivity
      this.forkOutputData.value = [...this.forkOutputData.value]
    }

    return this.forkOutputData.value[branchIndex] as SingleRunnerResult<InstanceType<O>>
  }

  // use when fork output data changes for only a specific branch
  markBranchDirty(store: PipelineStore, branchIndex: number): void {
    this.forkOutputData.value[branchIndex] = undefined
    const branchId = this.branchIds.value[branchIndex]
    store.markDirty(branchId)
  }

  private async runBranch(store: PipelineStore, branchIndex: number): Promise<
    SingleRunnerResult<InstanceType<O>>
  > {
    return this.logFunction('runBranch', async () => {
      const {
        output: inputData,
        preview: inputPreview,
        meta,
      } = await this.getResultFromPrev(store)

      const output = await this.handler!.run({
        config: this.config as RC,
        inputData,
        inputPreview,
        branchIndex,
        meta,
      })

      return parseResult<InstanceType<O>>(output, meta)
    })
  }

  serialize(): ForkNodeSerialized<SC> {
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
    return this.handler!.watcherTargets(this as InitializedForkNode<C, SC, RC, I, O, M>, super.getBaseWatcherTargets())
  }
}

type BranchNodeProperties = {
  prevNodeId: NodeId,
  branchIndex: number,
}
export type AnyBranchNodeSerialized = BranchNodeSerialized<any>
export type BranchNodeSerialized<SC> = BaseNodeSerialized<SC> & Required<BranchNodeProperties>
export type AnyBranchNode = BranchNode<any, any, any, any, any>
export type BranchNodeOptions<SC> = BaseNodeOptions<SC> & BranchNodeProperties

export class BranchNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
> extends StepOrBranchNode<C, SC, RC, I, O, M, AnyForkNode> {
  type = NodeType.BRANCH

  handler: BranchHandler<C, SC, RC, I, O> | undefined
  prevNodeId: NodeId
  branchIndex: number

  forkPreview: ImageData | null = null
  forkValidationErrors: StepValidationError[] = []

  constructor(options: BranchNodeOptions<SC>) {
    super(options)
    this.prevNodeId = options.prevNodeId
    this.branchIndex = options.branchIndex
  }

  serialize(): BranchNodeSerialized<SC> {
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
        config: this.config as RC,
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
        config: this.config as RC,
        inputData: inputData as StepInputTypesToInstances<I>,
        inputPreview,
        meta,
      })

      const result = parseResult<InstanceType<O>>(output, meta)

      this.outputData = result.output
      this.outputPreview = result.preview
      this.validationErrors = [...result.validationErrors, ...validationErrors]
      this.outputMeta = result.meta ?? meta
      this.forkValidationErrors = forkValidationErrors
    })
  }

  async getResultFromPrev(store: PipelineStore): Promise<SingleRunnerResult<StepDataTypeInstance>> {
    // return this.logFunction('getResultFromPrev', async () => {
    const fork = this.getPrev(store)
    const result = await fork.getBranchOutput(store, this.branchIndex)
    return result as SingleRunnerResult<InstanceType<O>>
    // })
  }

  getWatcherTargets(): WatcherTarget[] {
    return this.handler!.watcherTargets(this as InitializedBranchNode<C, SC, RC, I, O, M>, super.getBaseWatcherTargets())
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

export type AnyNode = GraphNode<any, any, any, any, any, any>

export type GraphNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
> =
  | StepNode<C, SC, RC, I, O, M>
  | ForkNode<C, SC, RC, I, O, M>
  | BranchNode<C, SC, RC, I, O, M>

export type InitializedStepNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
> = { __brand: 'step' }
  & WithRequired<StepNode<C, SC, RC, I, O, M>, 'config' | 'handler'>

export type InitializedForkNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
> = { __brand: 'fork' }
  & WithRequired<ForkNode<C, SC, RC, I, O, M>, 'config' | 'handler'>

export type InitializedBranchNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
> = { __brand: 'branch' }
  & WithRequired<BranchNode<C, SC, RC, I, O, M>, 'config' | 'handler'>

export type InitializedNode<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>,
> =
  | InitializedStepNode<C, SC, RC, I, O, M>
  | InitializedForkNode<C, SC, RC, I, O, M>
  | InitializedBranchNode<C, SC, RC, I, O, M>

export type AnyInitializedNode = InitializedNode<any, any, any, readonly StepDataType[], StepDataType, AnyStepMeta>

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

export const isStep = (n: AnyNode | AnyInitializedNode): n is AnyStepNode => useStepRegistry().getNodeType(n.def) === NodeType.STEP
export const isFork = (n: AnyNode | AnyInitializedNode): n is AnyForkNode => useStepRegistry().getNodeType(n.def) === NodeType.FORK
export const isBranch = (n: AnyNode | AnyInitializedNode): n is AnyBranchNode => useStepRegistry().getNodeType(n.def) === NodeType.BRANCH

const isStepSerialized = (n: AnyNodeSerialized): n is AnyStepNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.STEP
const isForkSerialized = (n: AnyNodeSerialized): n is AnyForkNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.FORK
const isBranchSerialized = (n: AnyNodeSerialized): n is AnyBranchNodeSerialized => useStepRegistry().getNodeType(n.def) === NodeType.BRANCH
