import type { BaseDataStructure } from '../step-data-types/BaseDataStructure.ts'
import type { IRunnerResultMeta, StepDataTypeInstance } from './_types.ts'
import { GenericValidationError } from './errors/GenericValidationError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'

type Preview = ImageData | null

export type SingleRunnerOutput<
  Out extends StepDataTypeInstance
> =
  | void
  | null
  | undefined
  | {
  preview?: Preview,
  output?: Out | null,
  validationErrors?: (StepValidationError | string)[],
  meta?: IRunnerResultMeta | null
}

export type SingleRunnerResult<Out extends StepDataTypeInstance> = {
  readonly [certifiedResult]: true,
  preview: Preview,
  output: Out | null,
  meta: IRunnerResultMeta | null,
  validationErrors: StepValidationError[]
}

export type NodeRunner<
  Input extends StepDataTypeInstance,
  Output extends StepDataTypeInstance,
  RC,
> =
  | NormalRunner<Input, Output, RC>
  | ForkRunner<Input, Output, RC>

export type NormalRunnerInput<
  Input extends StepDataTypeInstance,
  RC,
> = {
  config: RC,
  inputData: Input | null,
  inputPreview: Preview,
  meta: IRunnerResultMeta | null,
}

export interface NormalRunner<
  Input extends StepDataTypeInstance,
  Output extends StepDataTypeInstance,
  RC,
> {
  __normal?: never,
  (options: NormalRunnerInput<Input, RC>): Promise<SingleRunnerOutput<Output>>
}

export type ForkRunnerInput<
  Input extends StepDataTypeInstance,
  RC,
> = {
  config: RC,
  inputData: Input | null,
  inputPreview: Preview,
  meta: IRunnerResultMeta | null,
  branchIndex: number,
}

export interface ForkRunner<
  Input extends StepDataTypeInstance,
  Output extends StepDataTypeInstance,
  RC,
> {
  __fork?: never,
  (options: ForkRunnerInput<Input, RC>): Promise<SingleRunnerOutput<Output>>
}

const certifiedResult = Symbol(__DEV__ ? 'certified runner result' : '')

// SingleRunnerResult should only be created by this function
export function parseResult<
  Output extends StepDataTypeInstance,
>(
  out: SingleRunnerOutput<Output>,
  prevMeta: IRunnerResultMeta | null,
): SingleRunnerResult<Output> {
  return {
    [certifiedResult]: true,
    output: ((out?.output as unknown as BaseDataStructure)?.lock()) as Output ?? null,
    preview: out?.preview ?? null,
    meta: out?.meta ?? prevMeta ?? null,
    validationErrors: out?.validationErrors?.map(parseValidationError) ?? [],
  }
}

function parseValidationError(error: StepValidationError | string) {
  if (typeof error === 'string') return new GenericValidationError(error)

  return error
}

export async function defaultNormalRunner<
  Input extends StepDataTypeInstance,
  Output extends StepDataTypeInstance,
  RC,
>(
  {
    config,
    inputData,
    inputPreview,
    meta,
  }: NormalRunnerInput<Input, RC>,
) {
  return {
    output: inputData,
    preview: inputPreview,
    meta: meta,
  } as SingleRunnerOutput<Output>
}

export async function defaultForkRunner<
  Input extends StepDataTypeInstance,
  Output extends StepDataTypeInstance,
  RC,
>({
    inputData,
    branchIndex,
    inputPreview,
    meta,
  }: ForkRunnerInput<Input, RC>) {
  return {
    output: inputData,
    preview: inputPreview,
    meta,
  } as SingleRunnerOutput<Output>
}