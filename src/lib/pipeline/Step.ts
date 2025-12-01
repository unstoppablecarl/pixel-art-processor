import { type Reactive, shallowReactive, type ShallowReactive } from 'vue'
import type { StepDataType, StepDataTypeInstance } from '../../steps.ts'
import type { StepValidationError } from '../errors.ts'

import type { Config, IStepHandler } from './StepHandler.ts'

export type AnyStepContext = {
  C: any,
  Output: any,
  Input: any,
  RC: any,
  SerializedConfig: any,
  InputConstructors: any,
  OutputConstructors: any,
}

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

export type Step<T extends AnyStepContext> = {
  readonly id: string,
  readonly def: string,
  inputData: T['Input'] extends null ? null : T['Input'] | null,
  outputData: T['Output'] | null,
  // displayed to user
  outputPreview: ImageData | null,
  pendingInput: StepDataTypeInstance | null,
  isProcessing: boolean,
  validationErrors: StepValidationError[],
  config: T['RC'] | undefined,
  loadSerialized: StepLoaderSerialized<T['SerializedConfig']>
  handler: IStepHandler<T> | undefined
}

export type SerializedStep = {
  id: string,
  def: string,
  config: Config | undefined,
}

export type DeSerializedStep<T extends AnyStepContext = AnyStepContext> = Pick<Step<T>, 'id' | 'def' | 'config'> & {}

export type StepRef<T extends AnyStepContext = AnyStepContext> = ShallowReactive<Step<T>>

export function createNewStep<T extends AnyStepContext>(def: string, idIncrement: number): StepRef<T> {

  const id = `${def}_id_${idIncrement++}`
  return shallowReactive({
    id,
    def,
    inputData: null,
    outputData: null,
    outputPreview: null,
    pendingInput: null,
    isProcessing: false,
    validationErrors: [],
    config: undefined,
    handler: undefined,
    loadSerialized: null,
  })
}

export function createLoadedStep<T extends AnyStepContext>(stepData: DeSerializedStep<T>): StepRef<T> {
  const {
    id,
    def,
    config,
  } = stepData

  return shallowReactive({
    id,
    def,
    inputData: null,
    outputData: null,
    pendingInput: null,
    config: undefined,
    isProcessing: false,
    validationErrors: [] as StepValidationError[],
    loadSerialized: {
      config,
    },
  } as Step<T>)
}

export const serializeStep = <T extends AnyStepContext>(step: ShallowReactive<Step<T>>): SerializedStep => {

  const {
    id,
    def,
    config,
  } = step

  return {
    id,
    def,
    config: step.handler!.serializeConfig(config as Config),
  }
}

export const serializeSteps = <T extends AnyStepContext>(stepsById: Reactive<Record<string, ShallowReactive<Step<T>>>>) => {
  const output: Record<string, SerializedStep> = {}
  Object.values(stepsById).forEach(step => {
    output[step.id] = serializeStep(step)
  })

  return output
}