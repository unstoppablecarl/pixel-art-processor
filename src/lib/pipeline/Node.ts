import type { StepDataTypeInstance } from '../../steps.ts'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { nodeRunner } from './NodeRunner.ts'

export enum NodeType {
  STEP = 'STEP',
  FORK = 'FORK',
  BRANCH = 'BRANCH',
}

export type BaseNodeSerialized = {
  id: string,
  type: string,
  seed: number,
}

export abstract class BaseNode {
  readonly abstract type: NodeType
  seed = 0
  seedSum = 0

  isDirty = false
  isProcessing = false
  initialized = false
  lastExecutionTimeMS: undefined | number

  outputData: StepDataTypeInstance | StepDataTypeInstance[] | null = null

  abstract prevNodeId: string | null

  constructor(
    readonly id: string,
  ) {
  }

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

  async process(cb: (node: AnyNode) => void) {
    this.isProcessing = true
    const startTime = performance.now()

    const result = await cb(this as unknown as AnyNode)

    this.isProcessing = false
    this.isDirty = false
    this.lastExecutionTimeMS = performance.now() - startTime

    return result
  }

  abstract childIds(store: PipelineStore): string[]

  serialize(): BaseNodeSerialized {
    return {
      id: this.id,
      type: this.type,
      seed: this.seed,
    }
  }
}

export type StepNodeSerialized = BaseNodeSerialized & {
  prevNodeId: string | null,
}

export class StepNode extends BaseNode {
  type = NodeType.STEP

  outputData: StepDataTypeInstance | null = null

  constructor(
    id: string,
    public prevNodeId: string | null,
  ) {
    super(id)
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

  serialize(): StepNodeSerialized {
    return {
      ...super.serialize(),
      prevNodeId: this.prevNodeId,
    }
  }

  getOutput(): StepDataTypeInstance | null {
    return this.outputData
  }
}

export type ForkNodeSerialized = BaseNodeSerialized & {
  prevNodeId: string | null,
  branchIds: string[],
}

export class ForkNode extends BaseNode {
  type = NodeType.FORK
  branchIds: string[] = []

  outputData: StepDataTypeInstance[] = []

  constructor(
    id: string,
    public prevNodeId: string | null,
  ) {
    super(id)
  }

  isReady(store: PipelineStore) {
    if (!super.isReady(store)) return false
    if (!this.prevNodeId) return true

    return store.get(this.prevNodeId).outputReady()
  }

  childIds(store: PipelineStore) {
    return this.branchIds
  }

  getOutput(store: PipelineStore, branchIndex: number): StepDataTypeInstance | null {
    if (!this.outputData[branchIndex]) {
      this.outputData[branchIndex] = nodeRunner(store, this)
    }

    return this.outputData[branchIndex]
  }

  serialize(): ForkNodeSerialized {
    return {
      ...super.serialize(),
      prevNodeId: this.prevNodeId,
      branchIds: this.branchIds,
    }
  }
}

export type BranchNodeSerialized = BaseNodeSerialized & {
  parentForkId: string,
  branchIndex: number,
  nextId: string | null,
}

export class BranchNode extends BaseNode {
  type = NodeType.BRANCH
  outputData: StepDataTypeInstance | null = null

  constructor(
    id: string,
    public parentForkId: string,
    public branchIndex: number,
    public nextId: string | null,
  ) {
    super(id)
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

  serialize(): BranchNodeSerialized {
    return {
      ...super.serialize(),
      parentForkId: this.parentForkId,
      branchIndex: this.branchIndex,
      nextId: this.nextId,
    }
  }

  parentFork(store: PipelineStore): ForkNode {
    return store.get(this.parentForkId) as ForkNode
  }

  getOutput(): StepDataTypeInstance | null {
    return this.outputData
  }
}

export type AnyNode = StepNode | ForkNode | BranchNode
export type AnyNodeSerialized = StepNodeSerialized | ForkNodeSerialized | BranchNodeSerialized

export function deSerializeNode(data: StepNodeSerialized | ForkNodeSerialized | BranchNodeSerialized): AnyNode {
  if (isStepSerialized(data)) {
    return new StepNode(data.id, data.prevNodeId)
  }

  if (isForkSerialized(data)) {
    return new ForkNode(data.id, data.prevNodeId)
  }

  if (isBranchSerialized(data)) {
    return new BranchNode(data.id, data.parentForkId, data.branchIndex, data.nextId)
  }

  const message = 'invalid serialized node'
  console.error(message, data)
  throw new Error(message)
}

export const isStep = (n: AnyNode): n is StepNode => n.type === NodeType.STEP
export const isFork = (n: AnyNode): n is ForkNode => n.type === NodeType.FORK
export const isBranch = (n: AnyNode): n is BranchNode => n.type === NodeType.BRANCH

const isStepSerialized = (n: AnyNodeSerialized): n is StepNodeSerialized => n.type === NodeType.STEP
const isForkSerialized = (n: AnyNodeSerialized): n is ForkNodeSerialized => n.type === NodeType.FORK
const isBranchSerialized = (n: AnyNodeSerialized): n is BranchNodeSerialized => n.type === NodeType.BRANCH

