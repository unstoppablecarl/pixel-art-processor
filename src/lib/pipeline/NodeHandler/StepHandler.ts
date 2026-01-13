import type { Reactive } from 'vue'
import type { StepInputTypesToInstances } from '../../node-data-types/_node-data-types.ts'
import { type NodeId, NodeType } from '../_types.ts'
import type { InitializedStepNode } from '../Node.ts'
import { defaultNormalRunner, type NormalRunner } from '../NodeRunner.ts'
import type { AnyStepMeta, StepMetaIO } from '../types/definitions.ts'
import { makeHandler, type NodeHandler } from './NodeHandler.ts'
import { useNodeHandler } from './useHandlers.ts'

export type StepHandler<
  C,
  SC,
  RC,
  M extends AnyStepMeta<any, any>
> = NodeHandler<
  C,
  SC,
  RC,
  M
> & {
  meta: M,
  type: NodeType.STEP,
  run: NormalRunner<StepInputTypesToInstances<StepMetaIO<M>[0]>, InstanceType<StepMetaIO<M>[1]>, RC>,
}

export type StepHandlerOptions<
  C,
  SC,
  RC,
  M extends AnyStepMeta<any, any>
> = Partial<StepHandler<C, SC, RC, M>>

export function defineStepHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends AnyStepMeta<any, any> = AnyStepMeta,
>(
  meta: M,
  options?: StepHandlerOptions<C, SC, RC, M>,
) {

  return Object.assign(
    makeHandler<C, SC, RC, M>(meta, options),
    {
      type: NodeType.STEP,
      run: options?.run ?? defaultNormalRunner<StepInputTypesToInstances<StepMetaIO<M>[0]>, InstanceType<StepMetaIO<M>[1]>, RC>,
      meta,
    }) as StepHandler<C, SC, RC, M>
}

export function useStepHandler<
  C,
  SC,
  RC,
  M extends AnyStepMeta<any, any>
>(
  nodeId: NodeId,
  handler: StepHandler<C, SC, RC, M> & { meta: M },
): InitializedStepNode<C, SC, RC, M> {
  return useNodeHandler(nodeId, handler) as InitializedStepNode<C, SC, RC, M>
}