import type { MinStore } from '../../store/pipeline-store.ts'
import { logNodeEvent } from '../../util/misc.ts'
import { type NodeId, NodeType } from '../_types.ts'
import { StepValidationError } from '../errors/StepValidationError.ts'
import {
  type BaseNodeOptions,
  type BaseNodeSerialized,
  type InitializedBranchNode,
  parseResult,
  StepOrBranchNode,
} from '../Node.ts'
import type { NormalStepRunner, SingleRunnerResult } from '../NodeRunner.ts'
import type { AnyStepContext } from '../Step.ts'
import type { IStepHandler } from '../StepHandler.ts'
import type { AnyForkNode } from './ForkNode.ts'

type BranchNodeProperties = {
  prevNodeId: NodeId,
  branchIndex: number,
}
export type AnyBranchNodeSerialized = BranchNodeSerialized<AnyStepContext>
export type BranchNodeSerialized<T extends AnyStepContext> = BaseNodeSerialized<T> & Required<BranchNodeProperties>
export type AnyBranchNode = BranchNode<AnyStepContext>
export type BranchNodeOptions<T extends AnyStepContext> = BaseNodeOptions<T> & BranchNodeProperties

export class BranchNode<T extends AnyStepContext> extends StepOrBranchNode<T, InitializedBranchNode<T>, AnyForkNode> {
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

  getPrev(store: MinStore): AnyForkNode {
    return store.get(this.prevNodeId) as AnyForkNode
  }

  async runner(store: MinStore) {
    logNodeEvent(this.id, 'runner: start')
    const fork = this.getPrev(store)
    this.handler!.setPassThroughDataType(fork.handler!.outputDataType)

    const _handler = this.handler as IStepHandler<T, NormalStepRunner<T>>
    const { output: inputData, meta, validationErrors: forkValidationErrors } = await this.getOutputFromPrev(store)

    const output = await _handler.run({
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
    logNodeEvent(this.id, 'runner: end', result)
  }

  async getOutputFromPrev(store: MinStore): Promise<SingleRunnerResult<T>> {
    logNodeEvent(this.id, 'getOutputFromPrev: start')

    const fork = this.getPrev(store)
    const result = await fork.getBranchOutput(store, this.branchIndex)
    logNodeEvent(this.id, 'getOutputFromPrev: end', result)
    return result as SingleRunnerResult<T>
  }
}