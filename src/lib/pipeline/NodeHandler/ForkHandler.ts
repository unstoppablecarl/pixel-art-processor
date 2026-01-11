import { NodeType, type StepDataType, type StepMeta } from '../_types.ts'
import { makeHandler, type NodeHandler } from '../NodeHandler.ts'
import { defaultForkRunner, type ForkRunner } from '../NodeRunner.ts'
import type { StepContext } from '../Step.ts'

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
  run: ForkRunner<StepContext<StepMeta<I, O>, C, SC, RC>>,
}

export type ForkHandlerOptions<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
> = Partial<ForkHandler<C, SC, RC, I, O>>

export function makeForkHandler<
  C,
  SC,
  RC,
  I extends readonly StepDataType[],
  O extends StepDataType,
  M extends StepMeta<I, O> = StepMeta<I, O>
>(
  meta: M,
  options?: ForkHandlerOptions<C, SC, RC, I, O>,
): ForkHandler<C, SC, RC, I, O> {
  type T = StepContext<M, C, SC, RC>

  return {
    ...makeHandler<C, SC, RC, I, O>(meta, options),
    type: NodeType.FORK,
    run: options?.run ?? defaultForkRunner<T>,
  }
}