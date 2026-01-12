import { NodeType, type StepDataType, type StepInputTypesToInstances, type StepMeta } from '../_types.ts'
import type { AnyNode } from '../Node.ts'
import { defaultNormalRunner, type NormalRunner } from '../NodeRunner.ts'
import { makeHandler, type NodeHandler } from './NodeHandler.ts'

export function defineBranchHandler<
  C,
  SC,
  RC,
  M extends StepMeta<any, any>,
>(
  meta: M,
  options: BranchHandlerOptions<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >,
): BranchHandler<
  C,
  SC,
  RC,
  M['inputDataTypes'],
  M['outputDataType']
> {
  return makeBranchHandler(meta, options)
}

export type BranchHandler<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
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
  I extends readonly StepDataType[],
  O extends StepDataType,
> = Partial<BranchHandler<C, SC, RC, I, O>>

export function makeBranchHandler<
  C,
  SC,
  RC,
  M extends StepMeta<any, any>,
>(
  meta: M,
  options?: BranchHandlerOptions<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >,
): BranchHandler<
  C,
  SC,
  RC,
  M['inputDataTypes'],
  M['outputDataType']
> {
  type I = M['inputDataTypes']
  type O = M['outputDataType']

  return {
    ...makeHandler<C, SC, RC, I, O>(meta, options),
    type: NodeType.BRANCH,
    run: options?.run ?? defaultNormalRunner<StepInputTypesToInstances<I>, InstanceType<O>, RC>,
    onBranchEndResolved: options?.onBranchEndResolved,
  }
}