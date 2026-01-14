import { type Reactive, type WatchSource } from 'vue'

export enum NodeType {
  STEP = 'STEP',
  FORK = 'FORK',
  BRANCH = 'BRANCH',
}

export type NodeId = string & { readonly __nodeIdBrand: unique symbol }
export type NodeDef = string & { readonly __nodeDefBrand: unique symbol }

export type WatcherTarget = {
  name: string,
  target: WatchSource | Reactive<any>,
  deep?: boolean,
}

export type NodeDataTypeColor = {
  key: string,
  color: string,
  cssClass: string,
  pillCss?: string,
}

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

