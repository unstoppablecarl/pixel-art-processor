import type { Reactive } from 'vue'
import type { StepInputTypesToInstances } from '../../node-data-types/_node-data-types.ts'
import { type NodeId, NodeType } from '../_types.ts'
import type { InitializedForkNode } from '../Node.ts'
import { defaultForkRunner, type ForkRunner } from '../NodeRunner.ts'
import type { AnyForkMeta, ForkMetaIO } from '../types/definitions.ts'
import { makeHandler, type NodeHandler } from './NodeHandler.ts'
import { useNodeHandler } from './useHandlers.ts'

export type ForkHandler<
  C,
  SC,
  RC,
  M extends AnyForkMeta<any, any>
> = NodeHandler<
  C,
  SC,
  RC,
  M
> & {
  meta: M,
  type: NodeType.FORK,
  run: ForkRunner<StepInputTypesToInstances<ForkMetaIO<M>[0]>, InstanceType<ForkMetaIO<M>[1]>, RC>,
}

export type ForkHandlerOptions<
  C,
  SC,
  RC,
  M extends AnyForkMeta<any, any>
> = Partial<ForkHandler<C, SC, RC, M>>

export function defineForkHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends AnyForkMeta<any, any> = AnyForkMeta
>(
  meta: M,
  options?: ForkHandlerOptions<C, SC, RC, M>,
) {

  return Object.assign(
    makeHandler<C, SC, RC, M>(meta, options),
    {
      type: NodeType.FORK,
      run: options?.run ?? defaultForkRunner<StepInputTypesToInstances<ForkMetaIO<M>[0]>, InstanceType<ForkMetaIO<M>[1]>, RC>,
      meta,
    }) as ForkHandler<C, SC, RC, M>
}

export function useForkHandler<
  C,
  SC,
  RC,
  M extends AnyForkMeta<any, any>,
>(
  nodeId: NodeId,
  handler: ForkHandler<C, SC, RC, M> & { meta: M },
): InitializedForkNode<C, SC, RC, M> {
  return useNodeHandler(nodeId, handler) as InitializedForkNode<C, SC, RC, M>
}