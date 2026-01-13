import { usePipelineStore } from '../../store/pipeline-store.ts'
import { type NodeId, NodeType } from '../_types.ts'
import { BranchNode, ForkNode, type GraphNode, type InitializedNode, StepNode } from '../Node.ts'
import type { AnyBranchMeta, AnyForkMeta, AnyNodeMeta, AnyStepMeta } from '../types/definitions.ts'
import type { NodeHandler } from './NodeHandler.ts'

export function useNodeHandler<
  C,
  SC,
  RC,
  M extends AnyNodeMeta
>(
  nodeId: NodeId,
  handler: NodeHandler<C, SC, RC, M>,
) {
  const store = usePipelineStore()

  const node = store.get(nodeId) as GraphNode<C, SC, RC, M>
  const type = handler.meta.type

  if (type === NodeType.STEP) {
    type S = StepNode<C, SC, RC, Extract<M, AnyStepMeta<any, any>>>
    type H = NodeHandler<C, SC, RC, Extract<M, AnyStepMeta<any, any>>>
    (node as S).initialize(handler as H)
  } else if (type === NodeType.FORK) {
    type F = ForkNode<C, SC, RC, Extract<M, AnyForkMeta<any, any>>>
    type H = NodeHandler<C, SC, RC, Extract<M, AnyForkMeta<any, any>>>
    (node as F).initialize(handler as H)
  } else {
    type B = BranchNode<C, SC, RC, Extract<M, AnyBranchMeta<any, any>>>
    type H = NodeHandler<C, SC, RC, Extract<M, AnyBranchMeta<any, any>>>
    (node as B).initialize(handler as H)
  }

  return node as InitializedNode<C, SC, RC, M>
}



