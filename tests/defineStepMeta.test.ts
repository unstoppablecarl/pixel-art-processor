import { describe, expectTypeOf, it } from 'vitest'
import type { NodeDataType } from '../src/lib/node-data-types/_node-data-types.ts'

import { BitMask } from '../src/lib/node-data-types/BitMask'
import { HeightMap } from '../src/lib/node-data-types/HeightMap'
import { NormalMap } from '../src/lib/node-data-types/NormalMap'
import { NodeType } from '../src/lib/pipeline/_types'
import {
  defineBranch,
  defineFork,
  defineStep,
  type EffectiveInputConstructors,
  type EffectiveOutputConstructor,
} from '../src/lib/pipeline/types/definitions.ts'

class A extends BitMask {
}

class B extends NormalMap {
}

class COut extends HeightMap {
}

describe('defineStepMeta inference', () => {
  // ------------------------------------------------------------
  // 1. Normal step meta
  // ------------------------------------------------------------
  const META = defineStep({
    type: NodeType.STEP,
    def: 'normal',
    displayName: 'Normal',
    inputDataTypes: [BitMask, NormalMap],
    outputDataType: HeightMap,
  })

  type M = typeof META

  type InputCtors = EffectiveInputConstructors<M>

  expectTypeOf<InputCtors>().toExtend<
    readonly NodeDataType[]
  >()

  expectTypeOf<InputCtors[number]>().toEqualTypeOf<
    typeof A | typeof B
  >()

  it('infers inputDataTypes tuple correctly', () => {
    type I = EffectiveInputConstructors<M>
    expectTypeOf<I[number]>().toEqualTypeOf<typeof A | typeof B>()
  })

  it('infers outputDataType correctly', () => {
    type O = EffectiveOutputConstructor<M>
    expectTypeOf<O>().toEqualTypeOf<typeof COut>()
  })

  // ------------------------------------------------------------
  // 2. Passthrough meta
  // ------------------------------------------------------------
  const PASSTHROUGH = defineStep({
    type: NodeType.STEP,
    def: 'passthrough',
    displayName: 'Passthrough',
    passthrough: true,
    // inputDataTypes: ['foo']
  })

  type PM = typeof PASSTHROUGH

  it('passthrough meta infers no inputDataTypes property', () => {
    expectTypeOf<PM>().not.toHaveProperty('inputDataTypes')
  })

  // ------------------------------------------------------------
  // 3. Branch meta
  // ------------------------------------------------------------
  const BRANCH = defineBranch({
    type: NodeType.BRANCH,
    def: 'branch',
    displayName: 'Branch',
    inputDataTypes: [A],
    outputDataType: B,
  })

  type BM = typeof BRANCH

  it('branch meta infers input/output constructors', () => {
    type I = EffectiveInputConstructors<BM>
    type O = EffectiveOutputConstructor<BM>

    expectTypeOf<I[number]>().toEqualTypeOf<typeof A>()
    expectTypeOf<O>().toEqualTypeOf<typeof B>()
  })

  const FORK = defineFork({
    type: NodeType.FORK,
    def: 'fork',
    displayName: 'Fork',
    inputDataTypes: [A],
    outputDataType: B,
    branchDefs: ['left', 'right'],
  })

  type FM = typeof FORK

  it('fork meta infers branchDefs as readonly string[]', () => {
    expectTypeOf<FM['branchDefs'][number]>().toEqualTypeOf<string>()
  })
})
