import { ref, type Ref } from 'vue'
import { GenericValidationError } from './errors/GenericValidationError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import type { MinStore } from '../store/pipeline-store.ts'
import { type ImgSize, logNodeEvent } from '../util/misc.ts'
import { deepUnwrap } from '../util/vue-util.ts'
import {
  type IRunnerMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type WatcherTarget,
  type WithRequired,
} from './_types.ts'
import type {
  ForkStepRunner,
  NodeRunner,
  NormalStepRunner,
  RunnerPrevOutput,
  SingleRunnerOutput,
  SingleRunnerOutputValidationError,
  SingleRunnerResult,
} from './NodeRunner.ts'
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
  N extends InitializedNode<T>
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

  abstract getOutputFromPrev(store: MinStore): Promise<T['Input'] | null>

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
}

type AbstractConstructor = abstract new (...args: any[]) => any

function WithStepOrFork<TBase extends AbstractConstructor>(Base: TBase) {
  abstract class StepOrForkNode extends Base {
    async getOutputFromPrev(store: MinStore): Promise<RunnerPrevOutput<any>> {
      if (!this.prevNodeId) {
        return {
          prevOutput: null,
          meta: null,
          validationErrors: [],
        }
      }

      const prev = store.get(this.prevNodeId) as AnyStepNode | AnyBranchNode

      return {
        prevOutput: prev.outputData,
        meta: prev.outputMeta,
        validationErrors: [],
      }
    }
  }

  return StepOrForkNode
}

abstract class StepOrBranchNode<
  T extends AnyStepContext,
  N extends InitializedStepNode<T> | InitializedBranchNode<T>
> extends BaseNode<T, NormalStepRunner<T>, N> {
  outputData: T['Output'] | null = null
  outputPreview: ImageData | null = null
  outputMeta: IRunnerMeta | null = null

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

type StepNodeProperties = {
  muted: boolean
}
export type AnyStepNodeSerialized = StepNodeSerialized<AnyStepContext>
export type StepNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & StepNodeProperties
export type AnyStepNode = StepNode<AnyStepContext>
export type StepNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & Partial<StepNodeProperties>

const StepBase = WithStepOrFork(StepOrBranchNode)

export class StepNode<
  T extends AnyStepContext,
  N extends InitializedStepNode<T> = InitializedStepNode<T>
> extends StepBase<T, N> {
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

  async runner(store: MinStore) {
    logNodeEvent(this.id, 'runner: start')

    if (this.muted) {
      const { prevOutput, meta } = await this.getOutputFromPrev(store)

      this.outputData = prevOutput
      this.outputPreview = null
      this.validationErrors = []
      this.outputMeta = meta

      this.setPassThroughDataTypeFromPrev(store)
      return
    }

    if (store.nodeIsPassthrough(this)) {
      this.setPassThroughDataTypeFromPrev(store)
    }

    const _handler = this.handler as IStepHandler<T, NormalStepRunner<T>>
    const { prevOutput, meta } = await this.getOutputFromPrev(store)

    const output = await _handler.run({
      config: this.config as T['RC'],
      inputData: prevOutput,
      meta,
    })

    const result = parseResult<T>(output)
    this.outputData = result.output
    this.outputPreview = result.preview
    this.validationErrors = result.validationErrors
    logNodeEvent(this.id, 'runner: end', result)
  }

  getWatcherTargets(): WatcherTarget[] {
    const defaults = [...super.getWatcherTargets(), {
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
export type AnyForkNode = ForkNode<AnyStepContext>
export type ForkNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & ForkNodeProperties

const ForkBase = WithStepOrFork(BaseNode)

export class ForkNode<T extends AnyStepContext> extends ForkBase<T, ForkStepRunner<T>, InitializedForkNode<T>> {
  type = NodeType.FORK

  branchIds: Ref<NodeId[]> = ref<NodeId[]>([])
  forkOutputData: Ref<(SingleRunnerResult<T> | undefined)[]> = ref([])

  constructor(options: ForkNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId ?? null
    this.branchIds.value = options.branchIds ?? []
  }

  childIds(store: MinStore) {
    return this.branchIds.value
  }

  async runner(store: MinStore) {
    if (store.nodeIsPassthrough(this)) {
      this.setPassThroughDataTypeFromPrev(store)
    }

    this.forkOutputData.value = await Promise.all(
      this.branchIds.value.map((_, i) => {
        return this.runBranch(store, i)
      }),
    ) as SingleRunnerResult<T>[]
  }

  async getBranchOutput(store: MinStore, branchIndex: number): Promise<SingleRunnerResult<T>> {
    if (this.forkOutputData.value[branchIndex] === undefined) {
      this.forkOutputData.value[branchIndex] = await this.runBranch(store, branchIndex)
      // trigger reactivity
      this.forkOutputData.value = [...this.forkOutputData.value]
    }

    return this.forkOutputData.value[branchIndex] as SingleRunnerResult<T>
  }

  // use when fork output data changes for only a specific branch
  markBranchDirty(store: MinStore, branchIndex: number): void {
    this.forkOutputData.value[branchIndex] = undefined
    const branchId = this.branchIds.value[branchIndex]
    store.markDirty(branchId)
  }

  private async runBranch(store: MinStore, branchIndex: number): Promise<
    SingleRunnerResult<T>
  > {
    logNodeEvent(this.id, 'runBranch', { branchIndex })
    const { prevOutput, meta } = await this.getOutputFromPrev(store)
    const _handler = this.handler as IStepHandler<T, ForkStepRunner<T>>
    const output = await _handler.run({
      config: this.config as T['RC'],
      inputData: prevOutput,
      branchIndex,
      meta,
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

  getOutputSize(): ImgSize {
    const first = this.forkOutputData.value[0]?.output
    return {
      width: first?.width ?? 0,
      height: first?.height ?? 0,
    }
  }

  removeBranch(store: MinStore, branchId: NodeId): void {
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
}

type BranchNodeProperties = {
  prevNodeId: NodeId,
  branchIndex: number,
}
export type AnyBranchNodeSerialized = BranchNodeSerialized<AnyStepContext>
export type BranchNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & Required<BranchNodeProperties>
export type AnyBranchNode = BranchNode<AnyStepContext>
export type BranchNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & BranchNodeProperties

export class BranchNode<T extends AnyStepContext> extends StepOrBranchNode<T, InitializedBranchNode<T>> {
  type = NodeType.BRANCH
  handler: IStepHandler<T, NormalStepRunner<T>>

  prevNodeId: NodeId
  branchIndex: number
  initialized = true

  constructor(options: BranchNodeOptions<T>) {
    super(options)
    this.prevNodeId = options.prevNodeId
    this.branchIndex = options.branchIndex

    this.handler = makeStepHandler<AnyStepContext, NormalStepRunner<AnyStepContext>>(this.def, {
      passthrough: true,
      run: (() => null) as unknown as NormalStepRunner<AnyStepContext>,
      serializeConfig() {
        // noop
      },
    }) as unknown as IStepHandler<T, NormalStepRunner<T>>
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
    this.handler.setPassThroughDataType(fork.handler!.outputDataType)

    const { prevOutput, meta, validationErrors } = await this.getOutputFromPrev(store)
    this.outputData = prevOutput
    this.outputMeta = meta
    this.outputPreview = null
    this.validationErrors = validationErrors
  }

  async getOutputFromPrev(store: MinStore): Promise<RunnerPrevOutput<T>> {
    logNodeEvent(this.id, 'getOutputFromPrev: start')

    const fork = this.parentFork(store)
    const result = await fork.getBranchOutput(store, this.branchIndex)
    logNodeEvent(this.id, 'getOutputFromPrev: end', result)
    return {
      prevOutput: result.output,
      meta: result.meta,
      validationErrors: result.validationErrors,
    }
  }

  initialize(handlerOptions: StepHandlerOptions<T>): void {
    // noop
  }

  getWatcherTargets(): WatcherTarget[] {
    return [
      {
        name: 'seed',
        target: () => this.seed,
      },
    ]
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

function parseResult<T extends AnyStepContext>(result: SingleRunnerOutput<T>): SingleRunnerResult<T> {
  const output = result?.output ?? null
  const preview = result?.preview ?? null

  return {
    output: Object.freeze(output),
    preview: Object.freeze(preview),
    meta: structuredClone(output?.meta ?? null),
    validationErrors: result?.validationErrors?.map(parseValidationError) ?? [],
  }
}

export function assertInitialized<T extends AnyStepContext, R extends NodeRunner<T>>(
  node: GraphNode<T>,
): asserts node is GraphNode<T> & { handler: IStepHandler<T, R>, config: NonNullable<GraphNode<T>['config']> } {
  if (!node.initialized || !node.handler || node.config === undefined) {
    throw new Error('Node not initialized')
  }
}

function parseValidationError(error: SingleRunnerOutputValidationError) {
  if (typeof error === 'string') {
    return new GenericValidationError(error)
  }
  return error
}