import { type Component, type Reactive, type WatchSource } from 'vue'
import { STEP_DATA_TYPE_COLORS } from '../../steps.ts'
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
> = {
  type: NodeType,
  def: string,
  displayName: string,
} & StepDataConfig<I, O>

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

export type StepDefinition<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = {
  readonly component: Component,
} & Omit<StepMeta<I, O>, 'def'> & { def: NodeDef }

export type AnyStepDefinition = StepDefinition<any, any>

export type Config = Record<string, any>
export type WatcherTarget = WatchSource | Reactive<any>

export type NodeDataTypeColor = { key: string, color: string, cssClass: string }
export type NodeDataTypeColors = typeof STEP_DATA_TYPE_COLORS