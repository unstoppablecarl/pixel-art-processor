import { type Reactive, shallowReactive, type ShallowReactive } from 'vue'
import type { StepDataType } from '../../steps.ts'
import type { StepValidationError } from '../errors.ts'
import { NodeType } from './Node.ts'

import type { Config, IStepHandler } from './StepHandler.ts'
import type { StepRunner } from './StepRunner.ts'

export type InitializedStep<
  T extends AnyStepContext,
  R extends StepRunner<T> = StepRunner<T>
> =
  (Omit<Step<T> & StepForkChild, 'config' | 'handler'> & {
    config: NonNullable<Step<T>['config']>,
    handler: IStepHandler<T, R>,
  }) |
  (Omit<Step<T> & StepRoot, 'config' | 'handler'> & {
    config: NonNullable<Step<T>['config']>,
    handler: IStepHandler<T, R>,
  })

export type AnyConfiguredStep =
  Required<Omit<Step<AnyStepContext>, 'config' | 'handler'>>
  & {
  config: any,
  handler: IStepHandler<any, any>,
}

export function assertConfiguredStep<T extends AnyStepContext>(step: Step<T> | StepRef<T>): asserts step is InitializedStep<T> {
  if (!step.config) throw new Error(`Step is not configured: ${step.id} has no config`)
  if (!step.handler) throw new Error(`Step is not configured: ${step.id} has no handler`)
}

export type AnyStepContext = StepContext<any, any, any, any, any>

export type StepContext<
  C extends Config,
  SerializedConfig extends Config,
  RC extends ReactiveConfigType<C>,
  Input extends readonly StepDataType[],
  Output extends StepDataType,
> = {
  C: C,
  SerializedConfig: SerializedConfig,
  RC: RC,
  InputConstructors: Input,
  OutputConstructors: Output,
  Output: InstanceType<Output>,
  Input: StepInputTypesToInstances<Input>,
}

export type ReactiveConfigType<C extends Config> = ShallowReactive<C> | Reactive<C>;

export type StepLoaderSerialized<
  SerializedConfig extends Config
> = null
  | {
  config: SerializedConfig
}

export type AnyStep = Step<AnyStepContext>

export type Step<T extends AnyStepContext> = {
  readonly id: string,
  readonly def: string,
  outputData: T['Output'] | T['Output'][] | null,
  outputPreview: ImageData | ImageData[] | null,
  isProcessing: boolean,
  validationErrors: StepValidationError[],
  config: T['RC'] | undefined,
  loadSerialized: StepLoaderSerialized<T['SerializedConfig']>
  handler: IStepHandler<T> | undefined,
  initialized: boolean,
  lastExecutionTimeMS: undefined | number,
  seed: number,
  muted: boolean,
} & (StepRoot | StepForkChild)

type StepRoot = {
  parentForkId: null,
  branchIndex: null,
}

type StepForkChild = {
  parentForkId: string;
  branchIndex: number
}

export type SerializedStep = {
  id: string,
  def: string,
  type: NodeType,
  parentForkId: string | null,
  branchIndex: number | null,
  config: Config | undefined,
  seed: number,
}

export type DeSerializedStep<T extends AnyStepContext> =
  Pick<Step<T>, 'id' | 'def' | 'parentForkId' | 'branchIndex' | 'config' | 'seed'>
  & {}

export type StepRef<T extends AnyStepContext> = ShallowReactive<Step<T>>

export type AnyStepRef = StepRef<AnyStepContext>

export function createNewStep<T extends AnyStepContext>(
  def: string,
  idIncrement: number,
  parentForkId: string | null = null,
  branchIndex: number | null = null,
): StepRef<T> {

  const id = `${def}_id_${idIncrement++}`
  return shallowReactive({
    id,
    def,
    parentForkId,
    branchIndex,
    outputData: null,
    outputPreview: null,
    isProcessing: false,
    validationErrors: [],
    config: undefined,
    handler: undefined,
    loadSerialized: null,
    lastExecutionTimeMS: undefined,
    seed: 0,
    initialized: false,
    muted: false,
  } as Step<T>)
}

export function createLoadedStep<T extends AnyStepContext>(stepData: SerializedStep): StepRef<T> {
  const {
    id,
    def,
    parentForkId,
    branchIndex,
    config,
    seed,
  } = stepData

  return shallowReactive({
    id,
    def,
    parentForkId,
    branchIndex,
    outputData: null,
    config: undefined,
    isProcessing: false,
    validationErrors: [] as StepValidationError[],
    seed,
    initialized: false,
    loadSerialized: {
      config,
    },
  } as StepRef<T>)
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

export type StepInputTypesToInstances<Input extends readonly StepDataType[] = readonly StepDataType[]> = Input extends readonly []
  // first steps do not have input so convert [] to null
  ? null
  : Input[number] extends StepDataType
    // convert array of constructors to union of instances
    ? InstanceType<Input[number]>
    : never