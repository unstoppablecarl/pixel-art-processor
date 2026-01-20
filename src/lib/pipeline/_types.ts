import { type Reactive, type WatchSource } from 'vue'

export enum NodeType {
  STEP = 'STEP',
  FORK = 'FORK',
  BRANCH = 'BRANCH',
}

export type NodeId = string & { readonly __nodeIdBrand: unique symbol }
export type NodeDef = string & { readonly __nodeDefBrand: unique symbol }

export type WatcherTarget<T = any, V = any, OV = V | undefined> = {
  name: string,
  target: WatchSource<T>,
  deep?: boolean,
  filter?: (value: V, oldValue: OV) => boolean,
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

export type NormalizedConfig<C> = C
export type NormalizedReactiveConfig<C, RC> = RC extends Reactive<C> ? RC : Reactive<NormalizedConfig<C>>
export type StepLoaderSerialized<
  SerializedConfig
> = null
  | {
  config: SerializedConfig
}

export interface Position {
  x: number;
  y: number;
}

export type Direction = 'N' | 'S' | 'E' | 'W'
export type DirectionSet<T> = Readonly<Record<Direction, T>>
