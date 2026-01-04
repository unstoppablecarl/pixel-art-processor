import { StepValidationError } from '../errors/StepValidationError.ts'
import type { AnyStepContext } from './Step.ts'

export type SingleRunnerOutput<T extends AnyStepContext> =
  | null
  | undefined
  | {
  preview: SingleRunnerResult<T>['preview'],
  output: SingleRunnerResult<T>['output'],
  validationErrors: SingleRunnerOutputValidationError[]
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

export type NormalStepRunner<T extends AnyStepContext> = {
  __normal?: never
} &
  ((options: {
    config: T['RC'],
    inputData: T['Input'] | null,
  }) => Promise<
    SingleRunnerOutput<T>
  >)

export type ForkStepRunner<T extends AnyStepContext> = {
  __fork?: never
} & ((options: {
  config: T['RC'],
  inputData: T['Input'] | null,
  branchIndex: number,
}) => Promise<
  SingleRunnerOutput<T>
>)

