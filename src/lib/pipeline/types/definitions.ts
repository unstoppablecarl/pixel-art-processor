import type { Component } from 'vue'
import type { NodeDataType } from '../../node-data-types/_node-data-types.ts'
import { PassThrough } from '../../node-data-types/PassThrough.ts'
import { type NodeDef, NodeType } from '../_types.ts'

export const defineStep = <M extends AnyStepMeta<any, any>>(meta: M): M => meta
export const defineFork = <M extends AnyForkMeta<any, any>>(meta: M): M => meta
export const defineBranch = <M extends AnyBranchMeta<any, any>>(meta: M): M => meta

export type AnyNodeMeta = NodeMeta<any, any>

type IsValidDescendantDef = (def: AnyNodeDefinition) => boolean
type NodeMetaBase = {
  def: string
  displayName: string
  isValidDescendantDef?: IsValidDescendantDef,
  render?: false | undefined,
}

export type NodeMeta<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> =
  | AnyStepMeta<I, O>
  | AnyForkMeta<I, O>
  | AnyBranchMeta<I, O>

export type AnyStepMeta<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> = NodeMetaBase & StepSpecific & IO<I, O>

export type AnyForkMeta<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> = NodeMetaBase & ForkSpecific & IO<I, O> & {
  branchDefs: readonly string[]
}

export type AnyBranchMeta<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> = NodeMetaBase & BranchSpecific & IO<I, O>

type StepSpecific = {
  type: NodeType.STEP
}
type BranchSpecific = {
  type: NodeType.BRANCH
}
type ForkSpecific = {
  type: NodeType.FORK
}

export type NodeDefinitions = Record<string, AnyNodeDefinition>

type NodeDefinitionBase = {
  readonly def: NodeDef
  readonly displayName: string
  readonly component: Component
  readonly isValidDescendantDef?: IsValidDescendantDef
}

export type NodeDefinition<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> =
  | AnyStepDefinition<I, O>
  | AnyForkDefinition<I, O>
  | AnyBranchDefinition<I, O>

export type AnyStepDefinition<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> = NodeDefinitionBase & Readonly<StepSpecific> & IO<I, O>

export type AnyForkDefinition<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> = NodeDefinitionBase & Readonly<ForkSpecific> & IO<I, O> & {
  branchDefs: readonly NodeDef[]
}

export type AnyBranchDefinition<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> = NodeDefinitionBase & Readonly<BranchSpecific> & IO<I, O>

export type AnyNodeDefinition = NodeDefinition<any, any>

type PassthroughIO = {
  passthrough: true
  inputDataTypes?: undefined
  outputDataType?: undefined
}

type NormalIO<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> = {
  passthrough?: false
  inputDataTypes: I
  outputDataType: O
}

type IO<
  I extends readonly NodeDataType[] = readonly NodeDataType[],
  O extends NodeDataType = NodeDataType
> = PassthroughIO | NormalIO<I, O>

export type EffectiveInputConstructors<M extends NodeMeta<any, any>> =
// force distribution over union
  M extends unknown
    ? // first, handle passthrough
    M extends { passthrough: true }
      ? readonly [typeof PassThrough]
      : // otherwise, just use the StepMeta generic
      M extends NodeMeta<infer I, any>
        ? I
        : never
    : never

export type EffectiveOutputConstructor<M extends NodeMeta<any, any>> =
// force distribution over union
  M extends unknown
    ? M extends { passthrough: true }
      ? typeof PassThrough
      : M extends NodeMeta<any, infer O>
        ? O
        : never
    : never