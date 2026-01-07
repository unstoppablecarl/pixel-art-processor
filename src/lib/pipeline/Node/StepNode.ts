import type { MinStore } from '../../store/pipeline-store.ts'
import { logNodeEvent } from '../../util/misc.ts'
import { NodeType, type WatcherTarget } from '../_types.ts'
import {
  type BaseNodeOptions,
  type BaseNodeSerialized,
  type InitializedStepNode, parseResult,
  StepOrBranchNode,
  WithStepOrFork,
} from '../Node.ts'
import type { NormalStepRunner } from '../NodeRunner.ts'
import type { AnyStepContext } from '../Step.ts'
import type { IStepHandler } from '../StepHandler.ts'
import type { AnyForkNode } from './ForkNode.ts'

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
> extends StepBase<T, N, AnyForkNode | AnyStepNode> {
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

    const _handler = this.handler as IStepHandler<T, NormalStepRunner<T>>
    const { output: inputData, meta } = await this.getOutputFromPrev(store)

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