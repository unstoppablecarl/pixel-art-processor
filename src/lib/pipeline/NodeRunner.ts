import { StepValidationError } from './errors/StepValidationError.ts'
import type { IRunnerResultMeta } from './_types.ts'
import type { AnyStepContext } from './Step.ts'

export type RunnerMeta = IRunnerResultMeta | null

export type SingleRunnerOutput<T extends AnyStepContext> =
  | null
  | undefined
  | {
  preview?: SingleRunnerResult<T>['preview'],
  output?: SingleRunnerResult<T>['output'],
  validationErrors?: SingleRunnerOutputValidationError[],
  meta?: RunnerMeta
}

export type SingleRunnerOutputValidationError = StepValidationError | string

export type RunnerPrevOutput<T extends AnyStepContext> = {
  prevOutput: T['Output'] | null,
  meta: RunnerMeta,
  validationErrors: StepValidationError[]
}

export type SingleRunnerResult<T extends AnyStepContext> = {
  preview: ImageData | null,
  output: T['Output'] | null,
  meta: RunnerMeta,
  validationErrors: StepValidationError[]
}

export type NodeRunner<T extends AnyStepContext> =
  | NormalStepRunner<T>
  | ForkStepRunner<T>

export interface NormalStepRunner<T extends AnyStepContext> {
  (options: {
    config: T['RC'],
    inputData: T['Input'] | null,
    meta: RunnerMeta,
  }): Promise<SingleRunnerOutput<T>>
  __normal?: never,
}

export interface ForkStepRunner<T extends AnyStepContext> {
  (options: {
    config: T['RC'],
    inputData: T['Input'] | null,
    meta: RunnerMeta,
    branchIndex: number,
  }): Promise<SingleRunnerOutput<T>>
  __fork?: never
}

