import { StepValidationError } from '../errors.ts'
import type { AnyStepContext } from './Step.ts'

export type SingleRunnerOutput<T extends AnyStepContext> =
  | null
  | undefined
  | SingleRunnerResult<T['Output']>

export type SingleRunnerResult<T extends AnyStepContext> = {
  preview: ImageData | null,
  output: T['Output'] | null
  validationErrors: StepValidationError[]
}

export type StepRunner<T extends AnyStepContext> =
  | NormalStepRunner<T>
  | ForkStepRunner<T>

export type NormalStepRunner<T extends AnyStepContext> = (options: {
  config: T['RC'],
  inputData: T['Input'] | null,
}) => Promise<
  NormalStepRunnerOutput<T['Output']>
>

export type NormalStepRunnerOutput<T extends AnyStepContext> = SingleRunnerOutput<T>
export type NormalStepRunnerResult<T extends AnyStepContext> = SingleRunnerResult<T>

export type ForkStepRunner<T extends AnyStepContext> = (options: {
  config: T['RC'],
  inputData: T['Input'] | null,
  branchIndex: number,
}) => Promise<
  ForkStepRunnerOutput<T['Output']>
>

export type ForkStepRunnerOutput<T extends AnyStepContext> = SingleRunnerOutput<T>[]
export type ForkStepRunnerResult<T extends AnyStepContext> = SingleRunnerResult<T>[]