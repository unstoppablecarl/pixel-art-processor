import type { IRunnerResultMeta } from './_types.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import type { AnyStepContext } from './Step.ts'

export type SingleRunnerOutput<T extends AnyStepContext> =
  | null
  | undefined
  | {
  preview?: SingleRunnerResult<T>['preview'],
  output?: SingleRunnerResult<T>['output'],
  validationErrors?: (StepValidationError | string)[],
  meta?: SingleRunnerResult<T>['meta'] | null
}

export type SingleRunnerResult<T extends AnyStepContext> = {
  preview: ImageData | null,
  output: T['Output'] | null,
  meta: IRunnerResultMeta,
  validationErrors: StepValidationError[]
}

export type NodeRunner<T extends AnyStepContext> =
  | NormalStepRunner<T>
  | ForkStepRunner<T>

export interface NormalStepRunner<T extends AnyStepContext> {
  (options: {
    config: T['RC'],
    inputData: T['Input'] | null,
    meta: IRunnerResultMeta,
  }): Promise<SingleRunnerOutput<T>>
  __normal?: never,
}

export interface ForkStepRunner<T extends AnyStepContext> {
  (options: {
    config: T['RC'],
    inputData: T['Input'] | null,
    meta: IRunnerResultMeta,
    branchIndex: number,
  }): Promise<SingleRunnerOutput<T>>
  __fork?: never
}

