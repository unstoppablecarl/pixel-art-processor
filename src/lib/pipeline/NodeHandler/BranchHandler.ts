import type { Reactive } from 'vue'
import type { NodeDataType, StepInputTypesToInstances } from '../../node-data-types/_node-data-types.ts'
import { NodeType } from '../_types.ts'
import type { AnyNode } from '../Node.ts'
import { defaultNormalRunner, type NormalRunner } from '../NodeRunner.ts'
import type { NodeMeta } from '../types/definitions.ts'
import { makeHandler, type NodeHandler } from './NodeHandler.ts'

export type BranchHandler<
  C,
  SC,
  RC,
  I extends readonly NodeDataType[],
  O extends NodeDataType,
> = NodeHandler<
  C,
  SC,
  RC,
  I,
  O
> & {
  type: NodeType.BRANCH,
  run: NormalRunner<StepInputTypesToInstances<I>, InstanceType<O>, RC>,
  onBranchEndResolved?: (branchEndNode: AnyNode) => void,
}

export type BranchHandlerOptions<
  C,
  SC,
  RC,
  I extends readonly NodeDataType[],
  O extends NodeDataType,
> = Partial<BranchHandler<C, SC, RC, I, O>>

export function defineBranchHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends NodeMeta<any, any> = NodeMeta<any, any>,
>(
  meta: M,
  options?: BranchHandlerOptions<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >,
) {
  type I = M['inputDataTypes']
  type O = M['outputDataType']

  return Object.assign(
    makeHandler<C, SC, RC, I, O>(meta, options),
    {
      type: NodeType.BRANCH,
      run: options?.run ?? defaultNormalRunner<StepInputTypesToInstances<I>, InstanceType<O>, RC>,
      onBranchEndResolved: options?.onBranchEndResolved,

    }) as BranchHandler<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >
}