import { describe, expectTypeOf, it } from 'vitest'
import type { EffectiveInputConstructors, EffectiveOutputConstructor, StepDataType } from '../src/lib/pipeline/_types'
import { defineStepMeta, NodeType } from '../src/lib/pipeline/_types'
import type { StepContext } from '../src/lib/pipeline/Step'

import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'

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
  const META = defineStepMeta({
    type: NodeType.STEP,
    def: 'normal',
    displayName: 'Normal',
    inputDataTypes: [BitMask, NormalMap],
    outputDataType: HeightMap,
  })

  type M = typeof META

  type InputCtors = EffectiveInputConstructors<M>

  expectTypeOf<InputCtors>().toExtend<
    readonly StepDataType[]
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

  it('StepContext derives correct Input and Output', () => {
    type T = StepContext<M, any, any, any>

    expectTypeOf<T['Input']>().toEqualTypeOf<A | B>()
    expectTypeOf<T['Output']>().toEqualTypeOf<COut>()
  })

  it('StepContext derives correct Input and Output types', () => {
    type T = StepContext<M, { foo: number }, { foo: number }, { foo: number }>

    expectTypeOf<T['Input']>().toEqualTypeOf<A | B>()
    expectTypeOf<T['Output']>().toEqualTypeOf<COut>()
  })

  // ------------------------------------------------------------
  // 2. Passthrough meta
  // ------------------------------------------------------------
  const PASSTHROUGH = defineStepMeta({
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
  const BRANCH = defineStepMeta({
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

  const FORK = defineStepMeta({
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
