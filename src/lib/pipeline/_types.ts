import { type Reactive, type WatchSource } from 'vue'
import { BitMask } from '../step-data-types/BitMask.ts'
import { HeightMap } from '../step-data-types/HeightMap.ts'
import { NormalMap } from '../step-data-types/NormalMap.ts'
import { PassThrough } from '../step-data-types/PassThrough.ts'
import { PixelMap } from '../step-data-types/PixelMap.ts'

export enum NodeType {
  STEP = 'STEP',
  FORK = 'FORK',
  BRANCH = 'BRANCH',
}

export type NodeId = string & { readonly __nodeIdBrand: unique symbol }
export type NodeDef = string & { readonly __nodeDefBrand: unique symbol }

export type NodeDataType =
  | typeof BitMask
  | typeof NormalMap
  | typeof HeightMap
  | typeof PixelMap
  | typeof PassThrough

export type NodeDataTypeInstance =
  | BitMask
  | NormalMap
  | HeightMap
  | PixelMap
  | PassThrough

export type WatcherTarget = {
  name: string,
  target: WatchSource | Reactive<any>
}

export type NodeDataTypeColor = { key: string, color: string, cssClass: string }

export type WithRequired<T, K extends keyof T> =
  T & { [P in K]-?: NonNullable<T[P]> }

export interface IRunnerResultMeta {
}

export type NormalizedConfig<C> = C extends {} ? (undefined extends C ? {} : C) : C
export type NormalizedReactiveConfig<C, RC> = RC extends Reactive<C> ? RC : Reactive<NormalizedConfig<C>>
export type StepLoaderSerialized<
  SerializedConfig
> = null
  | {
  config: SerializedConfig
}
export type StepInputTypesToInstances<
  Input extends readonly NodeDataType[] = readonly NodeDataType[]
> =
  Input extends readonly []
    ? never
    : InstanceType<Input[number]>