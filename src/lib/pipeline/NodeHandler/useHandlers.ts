import { watch } from 'vue'
import { usePipelineStore } from '../../store/pipeline-store.ts'
import { logNodeWatch } from '../../util/misc.ts'
import type { NodeId, StepDataType, StepMeta } from '../_types.ts'
import type {
  GraphNode,
  InitializedBranchNode,
  InitializedForkNode,
  InitializedNode,
  InitializedStepNode,
} from '../Node.ts'
import { type BranchHandler } from './BranchHandler.ts'
import { type ForkHandler } from './ForkHandler.ts'
import type { AnyHandler, NodeHandler } from './NodeHandler.ts'
import { type StepHandler } from './StepHandler.ts'

export function useNodeHandler<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
>(
  nodeId: NodeId,
  handler: NodeHandler<C, SC, RC, I, O>,
) {
  const store = usePipelineStore()
  const node = store.get(nodeId) as GraphNode<C, SC, RC, I, O>

  node.initialize(handler as AnyHandler<C, SC, RC, I, O>)
  node.handler?.onAdded?.(node as InitializedNode<C, SC, RC, I, O>)

  node.getWatcherTargets()
    .forEach(({ name, target }) => {
      watch(target, () => {
        logNodeWatch(node.id, name)
        store.markDirty(node.id)
      }, { deep: true })
    })

  return node as InitializedNode<C, SC, RC, I, O>
}

export function useStepHandler<
  C,
  SC,
  RC,
  M extends StepMeta<any, any>,
>(
  nodeId: NodeId,
  meta: M,
  handler: StepHandler<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >,
): InitializedStepNode<
  C,
  SC,
  RC,
  M['inputDataTypes'],
  M['outputDataType'],
  M
> {
  return useNodeHandler(nodeId, handler) as InitializedStepNode<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType'],
    M
  >
}

export function useForkHandler<
  C,
  SC,
  RC,
  M extends StepMeta<any, any>,
>(
  nodeId: NodeId,
  meta: M,
  handler: ForkHandler<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >,
): InitializedForkNode<
  C,
  SC,
  RC,
  M['inputDataTypes'],
  M['outputDataType'],
  M
> {
  return useNodeHandler(nodeId, handler) as InitializedForkNode<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType'],
    M
  >
}

export function useBranchHandler<
  C,
  SC,
  RC,
  M extends StepMeta<any, any>,
>(
  nodeId: NodeId,
  meta: M,
  handler: BranchHandler<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >,
): InitializedBranchNode<
  C,
  SC,
  RC,
  M['inputDataTypes'],
  M['outputDataType'],
  M
> {
  return useNodeHandler(nodeId, handler) as InitializedBranchNode<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType'],
    M
  >
}