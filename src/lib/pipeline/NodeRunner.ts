import type { IRunnerResultMeta } from './_types.ts'
import { GenericValidationError } from './errors/GenericValidationError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'
import type { AnyStepContext } from './Step.ts'

type Preview = ImageData | null

export type SingleRunnerOutput<T extends AnyStepContext> =
  | null
  | undefined
  | {
  preview?: Preview,
  output?: T['Output'] | null,
  validationErrors?: (StepValidationError | string)[],
  meta?: IRunnerResultMeta | null
}

export type SingleRunnerResult<T extends AnyStepContext> = {
  readonly [certifiedResult]: true,
  preview: Preview,
  output: T['Output'] | null,
  meta: IRunnerResultMeta,
  validationErrors: StepValidationError[]
}

export type NodeRunner<T extends AnyStepContext> =
  | NormalStepRunner<T>
  | ForkStepRunner<T>

export type NormalStepRunnerInput<T extends AnyStepContext> = {
  config: T['RC'],
  inputData: T['Input'] | null,
  inputPreview: Preview,
  meta: IRunnerResultMeta,
}

export type NormalStepRunner<T extends AnyStepContext> = {
  __normal?: never,
  (options: NormalStepRunnerInput<T>): Promise<SingleRunnerOutput<T>>
}

export type ForkStepRunnerInput<T extends AnyStepContext> = {
  config: T['RC'],
  inputData: T['Input'] | null,
  inputPreview: Preview,
  meta: IRunnerResultMeta,
  branchIndex: number,
}

export type ForkStepRunner<T extends AnyStepContext> = {
  __fork?: never,
  (options: ForkStepRunnerInput<T>): Promise<SingleRunnerOutput<T>>
}

const certifiedResult = Symbol(__DEV__ ? 'certified runner result' : '')

// SingleRunnerResult should only be created by this function
export function parseResult<T extends AnyStepContext>(out: SingleRunnerOutput<T>): SingleRunnerResult<T> {
  return {
    [certifiedResult]: true,
    output: out?.output?.lock() ?? null,
    preview: out?.preview ?? null,
    meta: out?.meta ?? {},
    validationErrors: out?.validationErrors?.map(parseValidationError) ?? [],
  }
}

function parseValidationError(error: StepValidationError | string) {
  if (typeof error === 'string') return new GenericValidationError(error)

  return error
}
