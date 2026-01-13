import type { BaseDataStructure } from '../node-data-types/BaseDataStructure.ts'
import type { NodeDataTypeInstance } from '../node-data-types/_node-data-types.ts'
import type { IRunnerResultMeta } from './_types.ts'
import { GenericValidationError } from './errors/GenericValidationError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'

type Preview = ImageData | null

export type SingleRunnerOutput<
  Out extends NodeDataTypeInstance
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

export type SingleRunnerResult<Out extends NodeDataTypeInstance> = {
  readonly [certifiedResult]: true,
  preview: Preview,
  output: Out | null,
  meta: IRunnerResultMeta | null,
  validationErrors: StepValidationError[]
}

export type NodeRunner<
  Input extends NodeDataTypeInstance,
  Output extends NodeDataTypeInstance,
  RC,
> =
  | NormalRunner<Input, Output, RC>
  | ForkRunner<Input, Output, RC>

export type NormalRunnerInput<
  Input extends NodeDataTypeInstance,
  RC,
> = {
  config: RC,
  inputData: Input | null,
  inputPreview: Preview,
  meta: IRunnerResultMeta | null,
}

export interface NormalRunner<
  Input extends NodeDataTypeInstance,
  Output extends NodeDataTypeInstance,
  RC,
> {
  __normal?: never,
  (options: NormalRunnerInput<Input, RC>): Promise<SingleRunnerOutput<Output>>
}

export type ForkRunnerInput<
  Input extends NodeDataTypeInstance,
  RC,
> = {
  config: RC,
  inputData: Input | null,
  inputPreview: Preview,
  meta: IRunnerResultMeta | null,
  branchIndex: number,
}

export interface ForkRunner<
  Input extends NodeDataTypeInstance,
  Output extends NodeDataTypeInstance,
  RC,
> {
  __fork?: never,
  (options: ForkRunnerInput<Input, RC>): Promise<SingleRunnerOutput<Output>>
}

const certifiedResult = Symbol(__DEV__ ? 'certified runner result' : '')

// SingleRunnerResult should only be created by this function
export function parseResult<
  Output extends NodeDataTypeInstance,
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
  Input extends NodeDataTypeInstance,
  Output extends NodeDataTypeInstance,
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
  Input extends NodeDataTypeInstance,
  Output extends NodeDataTypeInstance,
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