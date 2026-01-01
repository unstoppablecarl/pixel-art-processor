import { StepValidationError } from '../errors.ts'
import type { AnyStepContext } from './Step.ts'

export type SingleRunnerOutput<T extends AnyStepContext> =
  | null
  | undefined
  | Partial<SingleRunnerResult<T>>

export type SingleRunnerResult<T extends AnyStepContext> = {
  preview: ImageData | null,
  output: T['Output'] | null
  validationErrors: StepValidationError[]
}

export type StepRunner<T extends AnyStepContext> =
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

