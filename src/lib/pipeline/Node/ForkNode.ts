import { ref, type Ref } from 'vue'
import type { MinStore } from '../../store/pipeline-store.ts'
import { type ImgSize, logNodeEvent } from '../../util/misc.ts'
import { type NodeId, NodeType } from '../_types.ts'
import {
  BaseNode,
  type BaseNodeOptions,
  type BaseNodeSerialized,
  type InitializedForkNode, parseResult, WithStepOrFork,
} from '../Node.ts'
import type { ForkStepRunner, SingleRunnerResult } from '../NodeRunner.ts'
import type { AnyStepContext } from '../Step.ts'
import type { IStepHandler } from '../StepHandler.ts'
import type { AnyBranchNode } from './BranchNode.ts'
import type { AnyStepNode } from './StepNode.ts'

type ForkNodeProperties = {
  prevNodeId?: NodeId | null,
  branchIds?: NodeId[],
}
export type AnyForkNodeSerialized = ForkNodeSerialized<AnyStepContext>
export type ForkNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & Required<ForkNodeProperties>
export type AnyForkNode = ForkNode<AnyStepContext>
export type ForkNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & ForkNodeProperties
const ForkBase = WithStepOrFork(BaseNode)

export class ForkNode<T extends AnyStepContext> extends ForkBase<T, ForkStepRunner<T>, InitializedForkNode<T>, AnyStepNode | AnyBranchNode> {
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
    const { output: prevOutput, meta } = await this.getOutputFromPrev(store)
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