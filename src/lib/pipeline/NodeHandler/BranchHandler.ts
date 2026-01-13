import type { Reactive } from 'vue'
import type { StepInputTypesToInstances } from '../../node-data-types/_node-data-types.ts'
import { type NodeId, NodeType } from '../_types.ts'
import type { AnyNode, InitializedBranchNode } from '../Node.ts'
import { defaultNormalRunner, type NormalRunner } from '../NodeRunner.ts'
import type { AnyBranchMeta, BranchMetaIO } from '../types/definitions.ts'
import { makeHandler, type NodeHandler } from './NodeHandler.ts'
import { useNodeHandler } from './useHandlers.ts'

export type BranchHandler<
  C,
  SC,
  RC,
  M extends AnyBranchMeta<any, any>
> = NodeHandler<
  C,
  SC,
  RC,
  M
> & {
  meta: M,
  type: NodeType.BRANCH,
  run: NormalRunner<StepInputTypesToInstances<BranchMetaIO<M>[0]>, InstanceType<BranchMetaIO<M>[1]>, RC>,
  onBranchEndResolved?: (branchEndNode: AnyNode) => void,
}

export type BranchHandlerOptions<
  C,
  SC,
  RC,
  M extends AnyBranchMeta<any, any>
> = Partial<BranchHandler<C, SC, RC, M>>

export function defineBranchHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends AnyBranchMeta<any, any> = AnyBranchMeta
>(
  meta: M,
  options?: BranchHandlerOptions<C, SC, RC, M>,
) {

  return Object.assign(
    makeHandler<C, SC, RC, M>(meta, options),
    {
      type: NodeType.BRANCH,
      run: options?.run ?? defaultNormalRunner<StepInputTypesToInstances<BranchMetaIO<M>[0]>, InstanceType<BranchMetaIO<M>[1]>, RC>,
      onBranchEndResolved: options?.onBranchEndResolved,
      meta,
    }) as BranchHandler<C, SC, RC, M>
}

export function useBranchHandler<
  C,
  SC,
  RC,
  M extends AnyBranchMeta<any, any>,
>(
  nodeId: NodeId,
  handler: BranchHandler<C, SC, RC, M> & { meta: M },
): InitializedBranchNode<C, SC, RC, M> {
  return useNodeHandler(nodeId, handler) as InitializedBranchNode<C, SC, RC, M>
}