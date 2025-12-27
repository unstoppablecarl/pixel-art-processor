import { type Reactive, shallowReactive, type ShallowReactive } from 'vue'
import type { StepDataType, StepDataTypeInstance } from '../../steps.ts'
import type { StepValidationError } from '../errors.ts'

import type { Config, ForkStepRunner, IStepHandler, StepRunner } from './StepHandler.ts'
import { useStepRegistry } from './StepRegistry.ts'

export type AnyStepContext = {
  C: any,
  Output: any,
  Input: any,
  RC: any,
  SerializedConfig: any,
  InputConstructors: any,
  OutputConstructors: any,
}
export const STEP_FORK_DEF = 'STEP_FORK'

export type StepInputTypesToInstances<Input extends readonly StepDataType[] = readonly StepDataType[]> = Input extends readonly []
  // first steps do not have input so convert [] to null
  ? null
  : Input[number] extends StepDataType
    // convert array of constructors to union of instances
    ? InstanceType<Input[number]>
    : never

export type StepContext<
  C extends Config = Config,
  SerializedConfig extends Config = C,
  RC extends ReactiveConfigType<C> = ReactiveConfigType<C>,
  Input extends readonly StepDataType[] = readonly StepDataType[],
  Output extends StepDataType = StepDataType,
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

export type ConfiguredStep<T extends AnyStepContext, Runner> = Step<T> & {
  handler: IStepHandler<T, Runner>
  config: T['RC']
}

export type ConfiguredNormalStep<T extends AnyStepContext> =
  ConfiguredStep<T, StepRunner<T>> & NormalStep<T>

export type ConfiguredForkStep<T extends AnyStepContext> =
  ConfiguredStep<T, ForkStepRunner<T>> & ForkStep<T>


export type AnyConfiguredStep = ConfiguredNormalStep<AnyStepContext> | ConfiguredForkStep<AnyStepContext>

export type BaseStep<T extends AnyStepContext> = {
  readonly id: string,
  readonly def: string,
  inputData: T['Input'] extends null ? null : T['Input'] | null,
  outputData: T['Output'] | T['Output'][] | null,
  outputPreview: ImageData | ImageData[] | null,
  pendingInput: StepDataTypeInstance | null,
  isProcessing: boolean,
  validationErrors: StepValidationError[],
  config: T['RC'] | undefined,
  loadSerialized: StepLoaderSerialized<T['SerializedConfig']>
  handler: IStepHandler<T, StepRunner<T> | ForkStepRunner<T>> | undefined,
  parentForkId: null | string,
  branchIndex: null | number,
  lastExecutionTimeMS: undefined | number,
  seed: number,
  muted: boolean,
}

export enum StepType {
  FORK = 'FORK',
  NORMAL = 'NORMAL',
}

declare const NormalBrand: unique symbol
declare const ForkBrand: unique symbol

export type NormalStep<T extends AnyStepContext> =
  BaseStep<T> & {
  // handler: IStepHandler<T, StepRunner<T>> | undefined,
  [NormalBrand]: true
}

export type ForkStep<T extends AnyStepContext> =
  BaseStep<T> & {
  // handler: IStepHandler<T, ForkStepRunner<T>> | undefined,
  [ForkBrand]: true,
}

export type Step<T extends AnyStepContext> =
  | NormalStep<T>
  | ForkStep<T>

export type SerializedStep = {
  id: string,
  def: string,
  parentForkId: string | null,
  branchIndex: number | null,
  config: Config | undefined,
  seed: number,
  muted: boolean,
}

export type DeSerializedStep<T extends AnyStepContext = AnyStepContext> =
  Pick<Step<T>, 'id' | 'def' | 'parentForkId' | 'branchIndex' | 'config' | 'seed' | 'muted'>
  & {}

export type StepRef<T extends AnyStepContext = AnyStepContext> = ShallowReactive<Step<T>>

export function createNewStep<T extends AnyStepContext>(
  def: string,
  idIncrement: number,
  parentForkId: string | null = null,
  branchIndex: number | null = null,
): StepRef<T> {

  const id = `${def}_id_${idIncrement++}`
  const step = {
    id,
    def,
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
  } as BaseStep<T>

  const type = useStepRegistry().getStepType(def)

  if (type === StepType.NORMAL) {
    return shallowReactive(step) as NormalStep<T>
  } else {
    return shallowReactive(step) as ForkStep<T>
  }
}

export function createLoadedStep<T extends AnyStepContext>(stepData: DeSerializedStep<T>): StepRef<T> {
  const {
    id,
    def,
    parentForkId,
    branchIndex,
    config,
    seed,
    muted,
  } = stepData

  return shallowReactive({
    id,
    def,
    parentForkId,
    branchIndex,
    inputData: null,
    outputData: null,
    pendingInput: null,
    config: undefined,
    isProcessing: false,
    validationErrors: [] as StepValidationError[],
    seed,
    muted,
    loadSerialized: {
      config,
    },
  } as Step<T>)
}

export const serializeStep = <T extends AnyStepContext>(step: ShallowReactive<Step<T>>): SerializedStep => {
  const {
    id,
    def,
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
