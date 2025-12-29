import type { StepDataTypeInstance } from '../../steps.ts'
import { StepValidationError } from '../errors.ts'
import { copyStepDataOrNull } from '../step-data-types/_step-data-type-helpers.ts'
import type { MaybePromise } from '../util/misc.ts'
import type { AnyStepContext } from './Step.ts'

export type StepRunner<T extends AnyStepContext> = ({ config, inputData }: {
  config: T['RC'],
  inputData: T['Input'] | null,
}) => MaybePromise<
  StepRunnerOutput<T['Output']>
>
export type StepRunnerOutput<Output> =
  | null
  | undefined
  | {
  preview?: ImageData | null,
  output?: Output | null,
  validationErrors?: StepValidationError[]
}
type RunnerPreviewOutput = ImageData | ImageData[] | null
export type ForkStepRunnerOutput<Output> =
  | null
  | undefined
  | {
  preview?: RunnerPreviewOutput,
  branchesOutput?: Output[] | null,
  validationErrors?: StepValidationError[]
}
export type ForkStepRunner<T extends AnyStepContext> = ({ config, inputData, branchCount }: {
  config: T['RC'],
  inputData: T['Input'] | null,
  branchCount: number,
}) => MaybePromise<
  ForkStepRunnerOutput<T['Output']>
>

export function parseStepRunnerResult<Output extends StepDataTypeInstance>(
  result: StepRunnerOutput<Output>,
): {
  preview: ImageData | null,
  validationErrors: StepValidationError[],
  outputData: Output | null,
} {
  return {
    outputData: copyStepDataOrNull(result?.output ?? null) ?? null,
    preview: result?.preview ?? null,
    validationErrors: result?.validationErrors ?? [],
  }
}

export function parseForkStepRunnerResult<Output extends StepDataTypeInstance>(result: ForkStepRunnerOutput<Output>): {
  preview: RunnerPreviewOutput,
  validationErrors: StepValidationError[],
  outputData: Output[],
} {
  return {
    outputData: result?.branchesOutput?.map(copyStepDataOrNull) ?? [],
    preview: result?.preview ?? null,
    validationErrors: result?.validationErrors ?? [],
  }
}