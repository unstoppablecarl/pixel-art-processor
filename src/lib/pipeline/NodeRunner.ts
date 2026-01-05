import { StepValidationError } from '../errors/StepValidationError.ts'
import type { AnyStepContext } from './Step.ts'

export type SingleRunnerOutput<T extends AnyStepContext> =
  | null
  | undefined
  | {
  preview?: SingleRunnerResult<T>['preview'],
  output?: SingleRunnerResult<T>['output'],
  validationErrors?: SingleRunnerOutputValidationError[]
}

export type SingleRunnerOutputValidationError = StepValidationError | string

export type SingleRunnerResult<T extends AnyStepContext> = {
  preview: ImageData | null,
  output: T['Output'] | null
  validationErrors: StepValidationError[]
}

export type NodeRunner<T extends AnyStepContext> =
  | NormalStepRunner<T>
  | ForkStepRunner<T>

export interface NormalStepRunner<T extends AnyStepContext> {
  (options: {
    config: T['RC'],
    inputData: T['Input'] | null,
  }): Promise<SingleRunnerOutput<T>>
  __normal?: never,
}

export interface ForkStepRunner<T extends AnyStepContext> {
  (options: {
    config: T['RC'],
    inputData: T['Input'] | null,
    branchIndex: number,
  }): Promise<SingleRunnerOutput<T>>
  __fork?: never
}

