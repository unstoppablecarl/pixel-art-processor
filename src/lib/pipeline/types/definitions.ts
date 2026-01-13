import type { Component } from 'vue'
import type { NodeDataType, NodeDataTypeTuple } from '../../node-data-types/_node-data-types'
import { type NodeDef, NodeType } from '../_types'

export function defineStep<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
>(meta: NormalStepMeta<I, O>): NormalStepMeta<I, O>
export function defineStep(meta: PassthroughStepMeta): PassthroughStepMeta
export function defineStep<O extends NodeDataType>(meta: StartStepMeta<O>): StartStepMeta<O>
export function defineStep(
  meta: AnyStepCase,
): AnyStepCase {
  return meta
}

type AnyStepCase =
  | NormalStepMeta<any, any>
  | PassthroughStepMeta
  | StartStepMeta<any>

export function defineFork<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
>(meta: NormalForkMeta<I, O>): NormalForkMeta<I, O>
export function defineFork(meta: PassthroughForkMeta): PassthroughForkMeta
export function defineFork<O extends NodeDataType>(meta: StartForkMeta<O>): StartForkMeta<O>
export function defineFork(
  meta: AnyForkCase,
): AnyForkCase {
  return meta
}

type AnyForkCase =
  | NormalForkMeta<any, any>
  | PassthroughForkMeta
  | StartForkMeta<any>

export function defineBranch<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
>(meta: NormalBranchMeta<I, O>): NormalBranchMeta<I, O>
export function defineBranch(meta: PassthroughBranchMeta): PassthroughBranchMeta
export function defineBranch<O extends NodeDataType>(meta: StartBranchMeta<O>): StartBranchMeta<O>
export function defineBranch(
  meta: AnyBranchCase,
): AnyBranchCase {
  return meta
}

type AnyBranchCase =
  | NormalBranchMeta<any, any>
  | PassthroughBranchMeta
  | StartBranchMeta<any>

export type AnyNodeMeta =
  | AnyStepMeta
  | AnyForkMeta
  | AnyBranchMeta

type IsValidDescendantDef = (def: AnyNodeDefinition) => boolean

type NodeMetaBase = {
  def: NodeDef
  displayName: string
  isValidDescendantDef?: IsValidDescendantDef
  render?: false | undefined
}

type Step = { type: NodeType.STEP }

export type AnyStepMeta<
  I extends NodeDataTypeTuple = NodeDataTypeTuple,
  O extends NodeDataType = NodeDataType
> = NormalStepMeta<I, O> | PassthroughStepMeta | StartStepMeta<O>

export type NormalStepMeta<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
> = NodeMetaBase & Step & NormalIO<I, O>

export type PassthroughStepMeta = NodeMetaBase & Step & PassthroughIO

export type StartStepMeta<O extends NodeDataType> =
  NodeMetaBase & Step & NoInput & {
  readonly outputDataType: O
}

type Fork = { type: NodeType.FORK }

export type AnyForkMeta<
  I extends NodeDataTypeTuple = NodeDataTypeTuple,
  O extends NodeDataType = NodeDataType
> = NormalForkMeta<I, O> | PassthroughForkMeta | StartForkMeta<O>

type ForkExtras = {
  branchDefs: NodeDef[]
}
export type NormalForkMeta<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
> = NodeMetaBase & Fork & NormalIO<I, O> & ForkExtras

export type PassthroughForkMeta = NodeMetaBase & Fork & PassthroughIO & ForkExtras

export type StartForkMeta<O extends NodeDataType> =
  NodeMetaBase & Fork & NoInput & {
  readonly outputDataType: O,
} & ForkExtras

type Branch = { type: NodeType.BRANCH }

export type AnyBranchMeta<
  I extends NodeDataTypeTuple = NodeDataTypeTuple,
  O extends NodeDataType = NodeDataType
> = NormalBranchMeta<I, O> | PassthroughBranchMeta | StartBranchMeta<O>

export type NormalBranchMeta<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
> = NodeMetaBase & Branch & NormalIO<I, O>

export type PassthroughBranchMeta = NodeMetaBase & Branch & PassthroughIO

export type StartBranchMeta<O extends NodeDataType> =
  NodeMetaBase & Branch & NoInput & {
  readonly outputDataType: O
}
export type NodeDefinitions = Record<NodeDef, AnyNodeDefinition>

export type AnyNodeDefinition =
  | StepDefinition<any, any>
  | ForkDefinition<any, any>
  | BranchDefinition<any, any>

export type NodeDefinition<
  I extends NodeDataTypeTuple = NodeDataTypeTuple,
  O extends NodeDataType = NodeDataType
> =
  | StepDefinition<I, O>
  | ForkDefinition<I, O>
  | BranchDefinition<I, O>

export type StepDefinition<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
> = (NormalStepMeta<I, O> & Comp)
  | (PassthroughStepMeta & Comp)
  | (StartStepMeta<O> & Comp)

export type ForkDefinition<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
> = (NormalForkMeta<I, O> & Comp)
  | (PassthroughForkMeta & Comp)
  | (StartForkMeta<O> & Comp)

export type BranchDefinition<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
> = (NormalBranchMeta<I, O> & Comp)
  | (PassthroughBranchMeta & Comp)
  | (StartBranchMeta<O> & Comp)

export type PassthroughIO = {
  readonly passthrough: true
  readonly inputDataTypes?: undefined
  readonly outputDataType?: undefined
}

export type NoInput = { readonly noInput: true }

export type NormalIO<
  I extends NodeDataTypeTuple,
  O extends NodeDataType
> = {
  readonly passthrough?: false
  readonly inputDataTypes: I
  readonly outputDataType: O
}

export type MetaIO<M extends AnyNodeMeta> =
// 1. Passthrough
  M extends { passthrough: true }
    ? [NodeDataTypeTuple, NodeDataType]

    // 2. Start node
    : M extends { noInput: true; outputDataType: infer O extends NodeDataType }
      ? [readonly [], O]

      // 3. Normal node
      : M extends {
          readonly inputDataTypes: infer I extends NodeDataTypeTuple
          readonly outputDataType: infer O extends NodeDataType
        }
        ? [I, O]

        // 4. Fallback (should never happen)
        : [NodeDataTypeTuple, NodeDataType]

export type StepMetaIO<M extends NormalStepMeta<any, any> | PassthroughStepMeta | StartStepMeta<any>> = MetaIO<M>
export type ForkMetaIO<M extends NormalForkMeta<any, any> | PassthroughForkMeta | StartForkMeta<any>> = MetaIO<M>
export type BranchMetaIO<M extends NormalBranchMeta<any, any> | PassthroughBranchMeta | StartBranchMeta<any>> = MetaIO<M>

type Comp = { component: Component }

export type AnyPassthroughMeta = Extract<AnyNodeMeta, { passthrough: true }>
export type AnyStartMeta = Extract<AnyNodeMeta, { noInput: true }>
export type AnyNormalMeta = Exclude<
  AnyNodeMeta,
  AnyPassthroughMeta | AnyStartMeta
>

export function isPassthroughMeta<M extends AnyNodeMeta>(
  meta: M,
): meta is Extract<M, AnyPassthroughMeta> {
  return (meta as any).passthrough === true
}

export function isStartMeta<M extends AnyNodeMeta>(
  meta: M,
): meta is Extract<M, AnyStartMeta> {
  return (meta as any).noInput === true
}

export function isNormalMeta<M extends AnyNodeMeta>(
  meta: M,
): meta is Extract<M, AnyNormalMeta> {
  return (meta as any).passthrough !== true && (meta as any).noInput !== true
}

export function getMetaInput<M extends AnyNodeMeta>(
  meta: M,
): MetaInput<M> {
  if (isNormalMeta(meta)) return meta.inputDataTypes as any
  return [] as any
}

export type MetaInput<M extends AnyNodeMeta> =
  M extends { noInput: true }
    ? readonly []
    : M extends { inputDataTypes: infer I extends NodeDataTypeTuple }
      ? I
      : readonly []

