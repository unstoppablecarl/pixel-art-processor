import type { Reactive } from 'vue'
import type { NodeDataType, StepInputTypesToInstances } from '../../node-data-types/_node-data-types.ts'
import { NodeType } from '../_types.ts'
import { defaultForkRunner, type ForkRunner } from '../NodeRunner.ts'
import type { NodeMeta } from '../types/definitions.ts'
import { makeHandler, type NodeHandler } from './NodeHandler.ts'

export type ForkHandler<
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
  type: NodeType.FORK,
  run: ForkRunner<StepInputTypesToInstances<I>, InstanceType<O>, RC>,
}

export type ForkHandlerOptions<
  C,
  SC,
  RC,
  I extends readonly NodeDataType[],
  O extends NodeDataType,
> = Partial<ForkHandler<C, SC, RC, I, O>>

export function defineForkHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends NodeMeta<any, any> = NodeMeta<any, any>,
>(
  meta: M,
  options?: ForkHandlerOptions<
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
      type: NodeType.FORK,
      run: options?.run ?? defaultForkRunner<StepInputTypesToInstances<I>, InstanceType<O>, RC>,
    }) as ForkHandler<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >
}