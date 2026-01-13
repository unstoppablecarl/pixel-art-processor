import { computed, type Reactive, ref, type Ref } from 'vue'
import type { NodeDataTypeInstance, StepInputTypesToInstances } from '../node-data-types/_node-data-types.ts'
import type { BaseDataStructure } from '../node-data-types/BaseDataStructure.ts'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { type ImgSize, logNodeEvent } from '../util/misc.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import {
  type IRunnerResultMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type NormalizedConfig,
  type StepLoaderSerialized,
  type WatcherTarget,
  type WithRequired,
} from './_types.ts'
import { InvalidInputInstanceTypeError } from './errors/InvalidInputInstanceTypeError.ts'
import { InvalidInputStaticTypeError } from './errors/InvalidInputStaticTypeError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import type { BranchHandler } from './NodeHandler/BranchHandler.ts'
import type { ForkHandler } from './NodeHandler/ForkHandler.ts'
import type { NodeHandler } from './NodeHandler/NodeHandler.ts'
import type { StepHandler } from './NodeHandler/StepHandler.ts'
import { getNodeRegistry } from './NodeRegistry.ts'
import { type NormalRunner, parseResult, type SingleRunnerResult } from './NodeRunner.ts'
import {
  type AnyBranchMeta,
  type AnyForkMeta,
  type AnyNodeMeta,
  type AnyStepMeta,
  type BranchMetaIO,
  type ForkMetaIO,
  isNormalMeta,
  type MetaIO,
  type StepMetaIO,
} from './types/definitions.ts'

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
  M extends AnyNodeMeta,
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
  abstract handler: NodeHandler<C, SC, RC, M> | undefined

  // system
  isDirty = ref(false)
  isProcessing = ref(false)
  initialized = ref(false)
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
    if (this.isProcessing.value) return false
    if (!this.initialized.value) return false
    if (!this.isDirty.value) return false

    if (!this.prevNodeId) return true

    return store.get(this.prevNodeId).outputReady()
  }

  outputReady(): boolean {
    return !this.isDirty.value
      && !this.isProcessing.value
      && this.initialized.value
  }

  computedOutputReady = computed((): boolean => {
    return !this.isDirty.value
      && !this.isProcessing.value
      && this.initialized.value
  })

  async processRunner(store: PipelineStore) {
    // await this.logFunction('processRunner', async () => {

    this.isProcessing.value = true
    const startTime = performance.now()

    await this.resolveRunner(store)

    this.isProcessing.value = false
    this.isDirty.value = false
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

  initialize(handler: NodeHandler<C, SC, RC, M>): void {

    this.handler = handler

    if (this.config === undefined) {
      this.config = handler.reactiveConfig(handler.config()) as RC
    }

    if (this.loadSerialized) {
      handler.loadConfig(this.config as RC, this.loadSerialized.config)
      this.loadSerialized = null
    }
    this.initialized.value = true
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

  validatePrev(store: PipelineStore, prevOutput: SingleRunnerResult<any>['output'], prevMeta: IRunnerResultMeta | null): StepValidationError[] {
    let result: StepValidationError[] = []
    // note at this point if this is a passthrough node its current type should match its prev node output
    const staticTypeErrors = this.validatePrevOutputTypeStatic(store)
    if (staticTypeErrors.length) {
      result = staticTypeErrors
    } else if (prevOutput) {
      result = this.validatePrevOutputTypeInstance(prevOutput)
    }

    return [
      ...result,
      ...this.handler!.validateInput(prevOutput, this.handler!.currentInputDataTypes as MetaIO<M>[0], prevMeta),
    ]
  }

  protected validatePrevOutputTypeStatic(store: PipelineStore): StepValidationError[] {
    const prev = this.getPrev(store) as InitializedNode<any, any, any>

    if (!prev) return []

    const meta = this.handler!.meta
    if (isNormalMeta(meta)) {
      const inputDataTypes = meta.inputDataTypes
      const outputDataType = prev.handler.currentOutputDataType
      if (!inputDataTypes.includes(outputDataType)) {
        return [new InvalidInputStaticTypeError(inputDataTypes, outputDataType)]
      }
    }

    return []
  }

  protected validatePrevOutputTypeInstance(inputData: NodeDataTypeInstance): StepValidationError[] {
    const inputDataTypes = this.handler!.currentInputDataTypes as MetaIO<M>[0]
    const isValid = (inputDataTypes as unknown as any[]).some(c => (inputData as any) instanceof c)
    if (isValid) return []
    const receivedType = (inputData as BaseDataStructure).constructor

    return [new InvalidInputInstanceTypeError(inputDataTypes, receivedType)]
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
  M extends AnyNodeMeta,
  PrevNode extends AnyNode = AnyNode
> extends BaseNode<C, SC, RC, M, PrevNode> {
  outputData: InstanceType<MetaIO<M>[1]> | null = null
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
export type AnyStepNode = StepNode<any, any, any, any>
export type StepNodeOptions<SC> = BaseNodeOptions<SC> & Partial<StepNodeProperties>

const StepBase = WithStepOrFork(StepOrBranchNode)

export class StepNode<
  C,
  SC,
  RC,
  M extends AnyStepMeta,
> extends StepBase<C, SC, RC, M, AnyForkNode | AnyStepNode> {

  type = NodeType.STEP

  muted: boolean
  handler: StepHandler<C, SC, RC, M> | undefined

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
    StepInputTypesToInstances<StepMetaIO<M>[0]>,
    InstanceType<StepMetaIO<M>[1]>,
    RC
  >
  >[0]): Promise<SingleRunnerResult<InstanceType<StepMetaIO<M>[1]>>> {
    return this.logFunction('step.run', async () => parseResult<InstanceType<StepMetaIO<M>[1]>>(
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

      const validationErrors = this.validatePrev(store, inputData, meta)
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
    return this.handler!.watcherTargets(this as InitializedStepNode<C, SC, RC>, defaults)
  }
}

type ForkNodeProperties = {
  prevNodeId?: NodeId | null,
  branchIds?: NodeId[],
}
export type AnyForkNodeSerialized = ForkNodeSerialized<any>
export type ForkNodeSerialized<SC> = BaseNodeSerialized<SC> & Required<ForkNodeProperties>
export type AnyForkNode = ForkNode<any, any, any, any>
export type ForkNodeOptions<SC> = BaseNodeOptions<SC> & ForkNodeProperties

const ForkBase = WithStepOrFork(BaseNode)

export class ForkNode<
  C,
  SC,
  RC,
  M extends AnyForkMeta<any, any>,
> extends ForkBase<C, SC, RC, M, AnyStepNode | AnyBranchNode> {
  type = NodeType.FORK

  handler: ForkHandler<C, SC, RC, M> | undefined
  branchIds: Ref<NodeId[]> = ref<NodeId[]>([])
  forkOutputData: Ref<(SingleRunnerResult<InstanceType<ForkMetaIO<M>[1]>> | undefined)[]> = ref([])
  maxBranchCount = ref<null | number>(null)

  canAddBranch = computed((): boolean => {
    const max = this.maxBranchCount.value
    if (max === null) return true

    return this.branchIds.value.length < max
  })

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
    ) as SingleRunnerResult<InstanceType<ForkMetaIO<M>[1]>>[]
  }

  getCachedBranchOutput(branchIndex: number): SingleRunnerResult<InstanceType<ForkMetaIO<M>[1]>> | null {
    return this.forkOutputData.value[branchIndex] ?? null
  }

  async getBranchOutput(store: PipelineStore, branchIndex: number): Promise<SingleRunnerResult<InstanceType<ForkMetaIO<M>[1]>>> {
    if (this.forkOutputData.value[branchIndex] === undefined) {
      this.forkOutputData.value[branchIndex] = await this.runBranch(store, branchIndex)
      // trigger reactivity
      this.forkOutputData.value = [...this.forkOutputData.value]
    }

    return this.forkOutputData.value[branchIndex] as SingleRunnerResult<InstanceType<ForkMetaIO<M>[1]>>
  }

  // use when fork output data changes for only a specific branch
  markBranchDirty(store: PipelineStore, branchIndex: number): void {
    this.forkOutputData.value[branchIndex] = undefined
    const branchId = this.branchIds.value[branchIndex]
    store.markDirty(branchId)
  }

  private async runBranch(store: PipelineStore, branchIndex: number): Promise<
    SingleRunnerResult<InstanceType<ForkMetaIO<M>[1]>>
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

      return parseResult<InstanceType<ForkMetaIO<M>[1]>>(output, meta)
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
    return this.handler!.watcherTargets(this as InitializedForkNode<C, SC, RC>, super.getBaseWatcherTargets())
  }
}

type BranchNodeProperties = {
  prevNodeId: NodeId,
  branchIndex: number,
}
export type AnyBranchNodeSerialized = BranchNodeSerialized<any>
export type BranchNodeSerialized<SC> = BaseNodeSerialized<SC> & Required<BranchNodeProperties>
export type AnyBranchNode = BranchNode<any, any, any, any>
export type BranchNodeOptions<SC> = BaseNodeOptions<SC> & BranchNodeProperties

export class BranchNode<
  C,
  SC,
  RC,
  M extends AnyBranchMeta<any, any>,
  // N extends InitializedBranchNode<C, SC, RC, BranchMetaIO<M>[0], BranchMetaIO<M>[1], M> = InitializedBranchNode<C, SC, RC, BranchMetaIO<M>[0], BranchMetaIO<M>[1], M>
> extends StepOrBranchNode<C, SC, RC, M, AnyForkNode> {
  type = NodeType.BRANCH

  handler: BranchHandler<C, SC, RC, M> | undefined
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

      const validationErrors = this.validatePrev(store, inputData, meta)
      if (validationErrors.length) {
        inputData = null
        inputPreview = null
        meta = null
      }

      const output = await this.handler!.run({
        config: this.config as RC,
        inputData: inputData as StepInputTypesToInstances<BranchMetaIO<M>[0]>,
        inputPreview,
        meta,
      })

      const result = parseResult<InstanceType<BranchMetaIO<M>[1]>>(output, meta)

      this.outputData = result.output
      this.outputPreview = result.preview
      this.validationErrors = [...result.validationErrors, ...validationErrors]
      this.outputMeta = result.meta ?? meta
      this.forkValidationErrors = forkValidationErrors
    })
  }

  async getResultFromPrev(store: PipelineStore): Promise<SingleRunnerResult<NodeDataTypeInstance>> {
    type O = BranchMetaIO<M>[1]
    // return this.logFunction('getResultFromPrev', async () => {
    const fork = this.getPrev(store)
    const result = await fork.getBranchOutput(store, this.branchIndex)
    return result as SingleRunnerResult<InstanceType<O>>
    // })
  }

  getWatcherTargets(): WatcherTarget[] {
    return this.handler!.watcherTargets(this as InitializedBranchNode<C, SC, RC>, super.getBaseWatcherTargets())
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

export type AnyNode = GraphNode<any, any, any, AnyNodeMeta>

export type GraphNode<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends AnyNodeMeta = AnyNodeMeta
> =
  | StepNode<C, SC, RC, Extract<M, AnyStepMeta<any, any>>>
  | ForkNode<C, SC, RC, Extract<M, AnyForkMeta<any, any>>>
  | BranchNode<C, SC, RC, Extract<M, AnyBranchMeta<any, any>>>

export type InitializedStepNode<
  C,
  SC,
  RC,
  M extends AnyStepMeta<any, any> = AnyStepMeta<any, any>
> = WithRequired<StepNode<C, SC, RC, M>, 'config' | 'handler'>

export type InitializedForkNode<
  C,
  SC,
  RC,
  M extends AnyForkMeta<any, any> = AnyForkMeta<any, any>
> = WithRequired<ForkNode<C, SC, RC, M>, 'config' | 'handler'>

export type InitializedBranchNode<
  C,
  SC,
  RC,
  M extends AnyBranchMeta<any, any> = AnyBranchMeta<any, any>
> = WithRequired<BranchNode<C, SC, RC, M>, 'config' | 'handler'>

export type InitializedNode<
  C,
  SC,
  RC,
  M extends AnyNodeMeta = AnyNodeMeta
> =
  | InitializedStepNode<C, SC, RC, Extract<M, AnyStepMeta<any, any>>>
  | InitializedForkNode<C, SC, RC, Extract<M, AnyForkMeta<any, any>>>
  | InitializedBranchNode<C, SC, RC, Extract<M, AnyBranchMeta<any, any>>>

export type AnyInitializedNode = InitializedNode<any, any, any>

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

export const isStep = (n: AnyNode | AnyInitializedNode): n is AnyStepNode => getNodeRegistry().getNodeType(n.def) === NodeType.STEP
export const isFork = (n: AnyNode | AnyInitializedNode): n is AnyForkNode => getNodeRegistry().getNodeType(n.def) === NodeType.FORK
export const isBranch = (n: AnyNode | AnyInitializedNode): n is AnyBranchNode => getNodeRegistry().getNodeType(n.def) === NodeType.BRANCH

const isStepSerialized = (n: AnyNodeSerialized): n is AnyStepNodeSerialized => getNodeRegistry().getNodeType(n.def) === NodeType.STEP
const isForkSerialized = (n: AnyNodeSerialized): n is AnyForkNodeSerialized => getNodeRegistry().getNodeType(n.def) === NodeType.FORK
const isBranchSerialized = (n: AnyNodeSerialized): n is AnyBranchNodeSerialized => getNodeRegistry().getNodeType(n.def) === NodeType.BRANCH
