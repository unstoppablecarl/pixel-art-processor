import { NodeType, type StepDataType, type StepMeta } from '../_types.ts'
import { makeHandler, type NodeHandler } from '../NodeHandler.ts'
import { defaultNormalRunner, type NormalRunner } from '../NodeRunner.ts'
import type { StepContext } from '../Step.ts'

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
  run: NormalRunner<StepContext<StepMeta<I, O>, C, SC, RC>>
}

export type StepHandlerOptions<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
> = Partial<StepHandler<C, SC, RC, I, O>>

export function makeStepHandler<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>
>(
  meta: M,
  options?: StepHandlerOptions<C, SC, RC, I, O>,
): StepHandler<C, SC, RC, I, O> {
  type T = StepContext<M, C, SC, RC>

  return {
    ...makeHandler<C, SC, RC, I, O>(meta, options),
    type: NodeType.STEP,
    run: options?.run ?? defaultNormalRunner<T>,
  }
}