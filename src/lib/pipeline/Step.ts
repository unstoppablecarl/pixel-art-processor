import { type Reactive, type ShallowReactive } from 'vue'

import type { Config, StepDataType } from './_types.ts'

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

export type StepInputTypesToInstances<Input extends readonly StepDataType[] = readonly StepDataType[]> = Input extends readonly []
  // first steps do not have input so convert [] to null
  ? null
  : Input[number] extends StepDataType
    // convert array of constructors to union of instances
    ? InstanceType<Input[number]>
    : never