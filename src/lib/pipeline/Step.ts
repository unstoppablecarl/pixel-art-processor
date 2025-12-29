import { type Reactive, shallowReactive, type ShallowReactive } from 'vue'
import type { StepDataType, StepDataTypeInstance } from '../../steps.ts'
import type { StepValidationError } from '../errors.ts'

import type { Config, IStepHandler } from './StepHandler.ts'

export const STEP_FORK_DEF = 'STEP_FORK'

export type StepInputTypesToInstances<Input extends readonly StepDataType[] = readonly StepDataType[]> = Input extends readonly []
  // first steps do not have input so convert [] to null
  ? null
  : Input[number] extends StepDataType
    // convert array of constructors to union of instances
    ? InstanceType<Input[number]>
    : never

export type AnyStepContext = StepContext<any, any, any, any, any>

export type StepContext<
  C extends Config,
  SerializedConfig extends Config,
  RC extends ReactiveConfigType<C>,
  Input extends readonly StepDataType[],
  Output extends StepDataType,
> = {
  C: C,
  OutputConstructors: Output,
  Output: InstanceType<Output>,
  InputConstructors: Input,
  Input: StepInputTypesToInstances<Input>,
  RC: RC,
  SerializedConfig: SerializedConfig,
}

export type ReactiveConfigType<C extends Config> = ShallowReactive<C> | Reactive<C>;

export type StepLoaderSerialized<
  SerializedConfig extends Config
> = null
  | {
  config: SerializedConfig
}

export type Step<T extends AnyStepContext> = {
  readonly id: string,
  readonly def: string,
  readonly type: StepType,
  inputData: T['Input'] extends null ? null : T['Input'] | null,
  outputData: T['Output'] | T['Output'][] | null,
  outputPreview: ImageData | ImageData[] | null,
  pendingInput: StepDataTypeInstance | null,
  isProcessing: boolean,
  validationErrors: StepValidationError[],
  config: T['RC'] | undefined,
  loadSerialized: StepLoaderSerialized<T['SerializedConfig']>
  handler: IStepHandler<T> | undefined,
  parentForkId: null | string,
  branchIndex: null | number,
  lastExecutionTimeMS: undefined | number,
  seed: number,
  muted: boolean,
}

export type SerializedStep = {
  id: string,
  def: string,
  type: StepType,
  parentForkId: string | null,
  branchIndex: number | null,
  config: Config | undefined,
  seed: number,
}

export enum StepType {
  FORK = 'FORK',
  NORMAL = 'NORMAL',
}

export type DeSerializedStep<T extends AnyStepContext> =
  Pick<Step<T>, 'id' | 'def' | 'type' | 'parentForkId' | 'branchIndex' | 'config' | 'seed'>
  & {}

export type StepRef<T extends AnyStepContext> = ShallowReactive<Step<T>>

export type AnyStepRef = StepRef<AnyStepContext>

export function createNewStep<T extends AnyStepContext>(
  def: string,
  idIncrement: number,
  type: StepType = StepType.NORMAL,
  parentForkId: string | null = null,
  branchIndex: number | null = null,
): StepRef<T> {

  const id = `${def}_id_${idIncrement++}`
  return shallowReactive({
    id,
    def,
    type,
    parentForkId,
    branchIndex,
    inputData: null,
    outputData: null,
    outputPreview: null,
    pendingInput: null,
    isProcessing: false,
    validationErrors: [],
    config: undefined,
    handler: undefined,
    loadSerialized: null,
    lastExecutionTimeMS: undefined,
    seed: 0,
    muted: false,
  } as Step<T>)
}

export function createLoadedStep<T extends AnyStepContext>(stepData: DeSerializedStep<T>): StepRef<T> {
  const {
    id,
    def,
    type,
    parentForkId,
    branchIndex,
    config,
    seed,
  } = stepData

  return shallowReactive({
    id,
    def,
    type,
    parentForkId,
    branchIndex,
    inputData: null,
    outputData: null,
    pendingInput: null,
    config: undefined,
    isProcessing: false,
    validationErrors: [] as StepValidationError[],
    seed,
    loadSerialized: {
      config,
    },
  } as Step<T>)
}

export const serializeStep = <T extends AnyStepContext>(step: ShallowReactive<Step<T>>): SerializedStep => {
  const {
    id,
    def,
    type,
    parentForkId,
    branchIndex,
    config,
    seed,
  } = step

  // config is likely in loadSerialized property and will be loaded later
  let _config = config
  if (_config !== undefined) {
    _config = step.handler!.serializeConfig(_config as Config)
  }

  return {
    id,
    def,
    type,
    parentForkId,
    branchIndex,
    config: _config,
    seed,
  } as SerializedStep
}

export const serializeSteps = <T extends AnyStepContext>(stepsById: Reactive<Record<string, ShallowReactive<Step<T>>>>) => {
  const output: Record<string, SerializedStep> = {}
  Object.values(stepsById).forEach(step => {
    output[step.id] = serializeStep(step)
  })

  return output
}

// export const isNormalStep = <T extends AnyStepContext>(
//   step: Step<T>,
// ): step is NormalStep<T> => step.type === StepType.NORMAL

// export const isForkStep = <T extends AnyStepContext>(
//   step: Step<T>,
// ): step is ForkStep<T> => step.type === StepType.FORK
