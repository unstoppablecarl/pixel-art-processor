import type { StepDataTypeInstance } from '../../steps.ts'
import { StepValidationError } from '../errors.ts'
import { copyStepDataOrNull } from '../step-data-types/_step-data-type-helpers.ts'
import type { MaybePromise, Narrows } from '../util/misc.ts'
import type { AnyStep, AnyStepContext } from './Step.ts'

export type PreviewOutput = ImageData | ImageData[] | null

export type StepRunner<T extends AnyStepContext> =
  | NormalStepRunner<T>
  | ForkStepRunner<T>

export type StepRunnerResult = {
  preview: AnyStep['outputPreview'],
  output: AnyStep['outputData'],
  validationErrors: AnyStep['validationErrors']
}

export type NormalStepRunner<T extends AnyStepContext> = ({ config, inputData }: {
  config: T['RC'],
  inputData: T['Input'] | null,
}) => MaybePromise<
  NormalStepRunnerOutput<T['Output']>
>

export type NormalStepRunnerOutput<Output> =
  | null
  | undefined
  | {
  preview?: ImageData | null,
  output?: Output | null,
  validationErrors?: StepValidationError[]
}

export type NormalStepRunnerResult<Output extends StepDataTypeInstance> = Narrows<StepRunnerResult, {
  preview: PreviewOutput | null,
  output: Output | null,
  validationErrors: StepValidationError[],
}>

export function toNormalStepRunnerResult<
  Output extends StepDataTypeInstance
>(result: NormalStepRunnerOutput<Output>): NormalStepRunnerResult<Output> {
  return {
    output: copyStepDataOrNull(result?.output ?? null) ?? null,
    preview: result?.preview ?? null,
    validationErrors: result?.validationErrors ?? [],
  }
}

export type ForkStepRunner<T extends AnyStepContext> = ({ config, inputData, branchCount }: {
  config: T['RC'],
  inputData: T['Input'] | null,
  branchCount: number,
}) => MaybePromise<
  ForkStepRunnerOutput<T['Output']>
>

export type ForkStepRunnerOutput<Output> =
  | null
  | undefined
  | {
  preview?: PreviewOutput,
  branchesOutput?: Output[] | null,
  validationErrors?: StepValidationError[]
}

export function toForkStepRunnerResult<
  Output extends StepDataTypeInstance
>(result: ForkStepRunnerOutput<Output>): ForkStepRunnerResult<Output> {
  return {
    output: result?.branchesOutput?.map(copyStepDataOrNull) ?? [],
    preview: result?.preview ?? null,
    validationErrors: result?.validationErrors ?? [],
  }
}

export type ForkStepRunnerResult<Output extends StepDataTypeInstance> = Narrows<StepRunnerResult, {
  preview: PreviewOutput,
  validationErrors: StepValidationError[],
  output: Output[],
}>
