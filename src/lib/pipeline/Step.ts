import { type Reactive, type ShallowReactive } from 'vue'

import type {
  AnyStepMeta,
  Config,
  EffectiveInputConstructors,
  EffectiveOutputConstructor,
  StepDataType, StepMeta,
} from './_types.ts'

export type AnyStepContext =   StepContext<AnyStepMeta, Config, Config, ReactiveConfigType<Config>>

export interface StepContext<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>
> {
  C: C
  SC: SC
  RC: RC

  InputConstructors: EffectiveInputConstructors<M>
  Input: StepInputTypesToInstances<EffectiveInputConstructors<M>>
  Output: InstanceType<EffectiveOutputConstructor<M>>
}



// it doesn't make sense, but it does need to be & not |
export type ReactiveConfigType<C extends Config> =
  ShallowReactive<C> & Reactive<C>;

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