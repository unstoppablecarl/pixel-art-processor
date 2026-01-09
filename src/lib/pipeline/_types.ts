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

export function defineStepMeta<M extends StepMeta<any, any>>(meta: M): M {
  return meta
}

export type AnyStepMeta = StepMeta<readonly StepDataType[], StepDataType>

export type StepMeta<
  I extends readonly StepDataType[] = readonly StepDataType[],
  O extends StepDataType = StepDataType
> =
  | (StepMetaBase & StepNodeSpecific & IO<I, O>)
  | (StepMetaBase & BranchNodeSpecific & IO<I, O>)
  | (StepMetaBase & ForkNodeSpecific & IO<I, O>)


export type StepMetaBase = {
  def: string
  displayName: string
  isValidDescendantDef?: (def: AnyStepDefinition) => boolean
}

type StepNodeSpecific = {
  type: NodeType.STEP
}

type BranchNodeSpecific = {
  type: NodeType.BRANCH
}

type ForkNodeSpecific = {
  type: NodeType.FORK
  branchDefs: readonly string[]
}


type PassthroughIO = {
  passthrough: true
  inputDataTypes?: undefined
  outputDataType?: undefined
}

type NormalIO<
  I extends readonly StepDataType[] = readonly StepDataType[],
  O extends StepDataType = StepDataType
> = {
  passthrough?: false
  inputDataTypes: I
  outputDataType: O
}

type IO<
  I extends readonly StepDataType[] = readonly StepDataType[],
  O extends StepDataType = StepDataType
> = PassthroughIO | NormalIO<I, O>


type StepDefinitionBase = {
  def: NodeDef
  displayName: string
  readonly component: Component
} & Pick<StepMetaBase, 'isValidDescendantDef'>

type StepDefinitionSpecific = {
  type: NodeType.STEP
}

type BranchDefinitionSpecific = {
  type: NodeType.BRANCH
}

type ForkDefinitionSpecific = {
  type: NodeType.FORK
  branchDefs: NodeDef[]
}

// export type AnyStepDefinition = StepDefinitionBase & StepDefinitionSpecific
export type AnyForkDefinition = StepDefinitionBase & ForkDefinitionSpecific
export type AnyBranchDefinition = StepDefinitionBase & StepDefinitionSpecific

export type StepDefinition<
  I extends readonly StepDataType[] = readonly StepDataType[],
  O extends StepDataType = StepDataType
> =
  | (StepDefinitionBase & StepDefinitionSpecific & IO<I, O>)
  | (StepDefinitionBase & BranchDefinitionSpecific & IO<I, O>)
  | (StepDefinitionBase & ForkDefinitionSpecific & IO<I, O>)

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

export type EffectiveInputConstructors<M extends StepMeta<any, any>> =
// force distribution over union
  M extends unknown
    ? // first, handle passthrough
    M extends { passthrough: true }
      ? readonly [typeof PassThrough]
      : // otherwise, just use the StepMeta generic
      M extends StepMeta<infer I, any>
        ? I
        : never
    : never

export type EffectiveOutputConstructor<M extends StepMeta<any, any>> =
// force distribution over union
  M extends unknown
    ? M extends { passthrough: true }
      ? typeof PassThrough
      : M extends StepMeta<any, infer O>
        ? O
        : never
    : never
