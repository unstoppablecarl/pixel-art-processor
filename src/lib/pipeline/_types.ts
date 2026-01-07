import { type Component, type Reactive, type WatchSource } from 'vue'
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

export type StepDataType =
  | typeof BitMask
  | typeof NormalMap
  | typeof HeightMap
  | typeof PixelMap
  | typeof PassThrough

export type StepDataTypeInstance =
  | BitMask
  | NormalMap
  | HeightMap
  | PixelMap
  | PassThrough

export type StepDefinitions = Record<string, AnyStepDefinition>
export type AnyStepMeta = StepMeta<any, any>

export type StepMeta<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = StepOrBranchStepMeta<I, O> | ForkStepMeta<I, O>

type StepMetaBase = {
  def: string,
  displayName: string,
  isValidDescendantDef?: (def: AnyStepDefinition) => boolean,
}

export type StepOrBranchStepMeta<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = StepMetaBase & StepDataConfig<I, O> & {
  type: NodeType.BRANCH | NodeType.STEP,
}

export type ForkStepMeta<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = StepMetaBase & StepDataConfig<I, O> & {
  type: NodeType.FORK,
  branchDefs: string[],
}

export type StepDefinition<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = StepOrBranchDefinition<I, O> | ForkDefinition<I, O>

type StepDefinitionBase = {
  def: NodeDef,
  displayName: string,
  readonly component: Component,
} & Pick<StepMetaBase, 'isValidDescendantDef'>

export type StepOrBranchDefinition<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = StepDefinitionBase &
  StepDataConfig<I, O> & {
  type: NodeType.BRANCH | NodeType.STEP,
}

export type ForkDefinition<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = StepDefinitionBase &
  StepDataConfig<I, O> & {
  type: NodeType.FORK,
  branchDefs: NodeDef[],
}

export type StepDataConfig<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = {
  passthrough?: false,
  inputDataTypes: I,
  outputDataType: O
} | {
  passthrough: true,
  inputDataTypes?: undefined,
  outputDataType?: undefined,
}

export type AnyStepDefinition = StepDefinition<any, any>

export type Config = Record<string, any>

export type WatcherTarget = {
  name: string,
  target: WatchSource | Reactive<any>
}

export type NodeDataTypeColor = { key: string, color: string, cssClass: string }

export type WithRequired<T, K extends keyof T> =
  T & { [P in K]-?: NonNullable<T[P]> }

export interface IRunnerResultMeta {
}