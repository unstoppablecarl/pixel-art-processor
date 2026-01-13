import { expectTypeOf } from 'expect-type'
import { describe, expect, it } from 'vitest'
import type { NodeDataType, NodeDataTypeTuple } from '../src/lib/node-data-types/_node-data-types.ts'
import { BitMask } from '../src/lib/node-data-types/BitMask'
import { HeightMap } from '../src/lib/node-data-types/HeightMap.ts'
import { NormalMap } from '../src/lib/node-data-types/NormalMap'
import { type NodeDef, NodeType } from '../src/lib/pipeline/_types'
import {
  type AnyStepMeta,
  type BranchMetaIO,
  defineBranch,
  defineFork,
  defineStep,
  type ForkMetaIO,
  type MetaIO,
  type StepMetaIO,
} from '../src/lib/pipeline/types/definitions'

// -----------------------------------------------------------------------------
// defineStep
// -----------------------------------------------------------------------------

describe('defineStep', () => {
  it('infers normal IO meta with tuple IO preserved via generic constraint', () => {
    const meta = defineStep({
      type: NodeType.STEP,
      def: 'normal-step' as NodeDef,
      displayName: 'Normal',
      inputDataTypes: [BitMask] as const,
      outputDataType: NormalMap,
    })

    expect(meta.type).toBe(NodeType.STEP)
    expect(meta.inputDataTypes).toEqual([BitMask])
    expect(meta.outputDataType).toBe(NormalMap)

    type M = typeof meta

    // Because I extends readonly NodeDataType[], TS infers a readonly tuple
    expectTypeOf<M['inputDataTypes']>().toEqualTypeOf<readonly [typeof BitMask]>()
    expectTypeOf<M['outputDataType']>().toEqualTypeOf<typeof NormalMap>()

    // StepMetaIO should resolve to [I, O]
    expectTypeOf<StepMetaIO<M>>()
      .toEqualTypeOf<[readonly [typeof BitMask], typeof NormalMap]>()
  })

  it('infers normal IO meta with tuple IO preserved via generic constraint', () => {
    const meta = defineStep({
      type: NodeType.STEP,
      def: 'normal-step' as NodeDef,
      displayName: 'Normal',
      inputDataTypes: [BitMask, HeightMap] as const,
      outputDataType: NormalMap,
    })

    expect(meta.type).toBe(NodeType.STEP)
    expect(meta.inputDataTypes).toEqual([BitMask, HeightMap])
    expect(meta.outputDataType).toBe(NormalMap)

    type M = typeof meta

    // Because I extends readonly NodeDataType[], TS infers a readonly tuple
    expectTypeOf<M['inputDataTypes']>().toEqualTypeOf<readonly [typeof BitMask, typeof HeightMap]>()
    expectTypeOf<M['outputDataType']>().toEqualTypeOf<typeof NormalMap>()

    // StepMetaIO should resolve to [I, O]
    expectTypeOf<StepMetaIO<M>>()
      .toEqualTypeOf<[readonly [typeof BitMask, typeof HeightMap], typeof NormalMap]>()
  })

  it('infers passthrough meta without IO fields and MetaIO fallback', () => {
    const meta = defineStep({
      type: NodeType.STEP,
      def: 'passthrough-step' as NodeDef,
      displayName: 'Passthrough',
      passthrough: true,
    })

    expect(meta.passthrough).toBe(true)

    type M = typeof meta

    // No IO fields
    expectTypeOf<M['inputDataTypes']>().toEqualTypeOf<undefined>()
    expectTypeOf<M['outputDataType']>().toEqualTypeOf<undefined>()

    // MetaIO fallback for passthrough
    expectTypeOf<StepMetaIO<M>>()
      .toEqualTypeOf<[NodeDataTypeTuple, NodeDataType]>()
  })
})

// -----------------------------------------------------------------------------
// defineFork
// -----------------------------------------------------------------------------

describe('defineFork', () => {
  it('infers normal fork IO and branchDefs as NodeDef[]', () => {
    const meta = defineFork({
      type: NodeType.FORK,
      def: 'fork-normal' as NodeDef,
      displayName: 'Fork Normal',
      inputDataTypes: [BitMask] as const,
      outputDataType: NormalMap,
      branchDefs: ['b0' as NodeDef, 'b1' as NodeDef],
    })

    expect(meta.branchDefs).toEqual(['b0', 'b1'])

    type M = typeof meta

    expectTypeOf<M['inputDataTypes']>().toEqualTypeOf<readonly [typeof BitMask]>()
    expectTypeOf<M['outputDataType']>().toEqualTypeOf<typeof NormalMap>()

    // Corrected: branchDefs is NodeDef[]
    expectTypeOf<M['branchDefs']>().toEqualTypeOf<NodeDef[]>()

    expectTypeOf<ForkMetaIO<M>>()
      .toEqualTypeOf<[readonly [typeof BitMask], typeof NormalMap]>()
  })

  it('infers passthrough fork without IO fields', () => {
    const meta = defineFork({
      type: NodeType.FORK,
      def: 'fork-pass' as NodeDef,
      displayName: 'Fork Pass',
      passthrough: true as const,
      branchDefs: ['b0' as NodeDef],
    })

    type M = typeof meta

    expectTypeOf<M['inputDataTypes']>().toEqualTypeOf<undefined>()
    expectTypeOf<M['outputDataType']>().toEqualTypeOf<undefined>()

    expectTypeOf<ForkMetaIO<M>>()
      .toEqualTypeOf<[NodeDataTypeTuple, NodeDataType]>()
  })
})

// -----------------------------------------------------------------------------
// defineBranch
// -----------------------------------------------------------------------------

describe('defineBranch', () => {
  it('infers normal branch IO and branchIndex', () => {
    const meta = defineBranch({
      type: NodeType.BRANCH,
      def: 'branch-normal' as NodeDef,
      displayName: 'Branch Normal',
      inputDataTypes: [NormalMap] as const,
      outputDataType: BitMask,
    })

    type M = typeof meta

    expectTypeOf<M['inputDataTypes']>().toEqualTypeOf<readonly [typeof NormalMap]>()
    expectTypeOf<M['outputDataType']>().toEqualTypeOf<typeof BitMask>()

    expectTypeOf<BranchMetaIO<M>>()
      .toEqualTypeOf<[readonly [typeof NormalMap], typeof BitMask]>()
  })

  it('infers passthrough branch without IO fields', () => {
    const meta = defineBranch({
      type: NodeType.BRANCH,
      def: 'branch-pass' as NodeDef,
      displayName: 'Branch Pass',
      passthrough: true as const,
    })

    type M = typeof meta

    expectTypeOf<M['inputDataTypes']>().toEqualTypeOf<undefined>()
    expectTypeOf<M['outputDataType']>().toEqualTypeOf<undefined>()

    expectTypeOf<BranchMetaIO<M>>()
      .toEqualTypeOf<[NodeDataTypeTuple, NodeDataType]>()
  })
})

// -----------------------------------------------------------------------------
// Cross-type sanity
// -----------------------------------------------------------------------------

describe('meta unions and MetaIO', () => {
  it('MetaIO works for AnyStepMeta/AnyForkMeta/AnyBranchMeta', () => {
    const step = defineStep({
      type: NodeType.STEP,
      def: 's' as NodeDef,
      displayName: 'S',
      inputDataTypes: [BitMask] as const,
      outputDataType: BitMask,
    })

    const fork = defineFork({
      type: NodeType.FORK,
      def: 'f' as NodeDef,
      displayName: 'F',
      inputDataTypes: [BitMask] as const,
      outputDataType: NormalMap,
      branchDefs: ['b0' as NodeDef],
    })

    const branch = defineBranch({
      type: NodeType.BRANCH,
      def: 'b' as NodeDef,
      displayName: 'B',
      inputDataTypes: [NormalMap] as const,
      outputDataType: BitMask,
    })

    expectTypeOf<StepMetaIO<typeof step>>()
      .toEqualTypeOf<[readonly [typeof BitMask], typeof BitMask]>()

    expectTypeOf<ForkMetaIO<typeof fork>>()
      .toEqualTypeOf<[readonly [typeof BitMask], typeof NormalMap]>()

    expectTypeOf<BranchMetaIO<typeof branch>>()
      .toEqualTypeOf<[readonly [typeof NormalMap], typeof BitMask]>()
  })

  it('MetaIO fallback works for passthrough AnyStepMeta', () => {
    const meta: AnyStepMeta = defineStep({
      type: NodeType.STEP,
      def: 's-pass' as NodeDef,
      displayName: 'S Pass',
      passthrough: true,
    })

    expectTypeOf<MetaIO<typeof meta>>()
      .toEqualTypeOf<[NodeDataTypeTuple, NodeDataType]>()
  })
})
