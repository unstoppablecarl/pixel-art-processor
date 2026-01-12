import type { Reactive } from 'vue'
import { NodeType, type StepDataType, type StepInputTypesToInstances, type StepMeta } from '../_types.ts'
import { defaultNormalRunner, type NormalRunner } from '../NodeRunner.ts'
import { makeHandler, type NodeHandler } from './NodeHandler.ts'

export function defineStepHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends StepMeta<any, any> = StepMeta<any, any>,
>(
  meta: M,
  options?: StepHandlerOptions<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >,
): StepHandler<
  C,
  SC,
  RC,
  M['inputDataTypes'],
  M['outputDataType']
> {
  return makeStepHandler(meta, options)
}

export type StepHandler<
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
  type: NodeType.STEP,
  run: NormalRunner<StepInputTypesToInstances<I>, InstanceType<O>, RC>,
}

export type StepHandlerOptions<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
> = Partial<StepHandler<C, SC, RC, I, O>>

export function makeStepHandler<
  C = {},
  SC = C,
  RC = Reactive<C>,
  M extends StepMeta<any, any> = StepMeta<any, any>,
>(
  meta: M,
  options?: StepHandlerOptions<
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
      type: NodeType.STEP,
      run: options?.run ?? defaultNormalRunner<StepInputTypesToInstances<I>, InstanceType<O>, RC>,
    }) as StepHandler<
    C,
    SC,
    RC,
    M['inputDataTypes'],
    M['outputDataType']
  >
}