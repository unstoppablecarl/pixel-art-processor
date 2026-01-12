import type { Reactive } from 'vue'
import { NodeType, type StepDataType, type StepInputTypesToInstances, type StepMeta } from '../_types.ts'
import { defaultForkRunner, type ForkRunner } from '../NodeRunner.ts'
import { makeHandler, type NodeHandler } from './NodeHandler.ts'

export function defineForkHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends StepMeta<any, any> = StepMeta<any, any>,
>(
  meta: M,
  options: ForkHandlerOptions<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >,
): ForkHandler<
  C,
  SC,
  RC,
  M['inputDataTypes'],
  M['outputDataType']
> {
  return makeForkHandler(meta, options)
}

export type ForkHandler<
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
  type: NodeType.FORK,
  run: ForkRunner<StepInputTypesToInstances<I>, InstanceType<O>, RC>,
}

export type ForkHandlerOptions<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
> = Partial<ForkHandler<C, SC, RC, I, O>>

export function makeForkHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends StepMeta<any, any> = StepMeta<any, any>,
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