import { describe, expectTypeOf, it } from 'vitest'
import {
  type AnyStepMeta,
  defineStepMeta,
  type EffectiveInputConstructors,
  type EffectiveOutputConstructor,
  NodeType,
  type StepDataType,
  type StepDataTypeInstance,
} from '../src/lib/pipeline/_types'
import { StepContext } from '../src/lib/pipeline/Step'
import { BitMask } from '../src/lib/step-data-types/BitMask'

import { PassThrough } from '../src/lib/step-data-types/PassThrough'
import { PixelMap } from '../src/lib/step-data-types/PixelMap'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

type RawConfig = { value: number }
type SerializedConfig = { value: number }
type RC = { value: number }

// ------------------------------------------------------------
// 1. Normal step meta → EffectiveInput/Output + StepContext
// ------------------------------------------------------------

describe('StepMeta → Effective* and StepContext for normal steps', () => {
  const META = defineStepMeta({
    type: NodeType.STEP,
    def: 'normal',
    displayName: 'Normal',
    passthrough: false,
    inputDataTypes: [BitMask, PixelMap],
    outputDataType: BitMask,
  })

  type M = typeof META
  type I = EffectiveInputConstructors<M>
  type O = EffectiveOutputConstructor<M>
  type T = StepContext<M, RawConfig, SerializedConfig, RC>

  it('EffectiveInputConstructors element types are BitMask | PixelMap', () => {
    // we avoid tuple equality and just assert element type
    type Elem = I[number]
    expectTypeOf<Elem>().toEqualTypeOf<typeof BitMask | typeof PixelMap>()
  })

  it('EffectiveOutputConstructor is BitMask', () => {
    expectTypeOf<O>().toEqualTypeOf<typeof BitMask>()
  })

  it('StepContext.Input is BitMask | PixelMap instances', () => {
    expectTypeOf<T['Input']>().toEqualTypeOf<BitMask | PixelMap>()
  })

  it('StepContext.InputConstructors element type matches inputDataTypes element type', () => {
    type CtorElem = T['InputConstructors'][number]
    expectTypeOf<CtorElem>().toEqualTypeOf<typeof BitMask | typeof PixelMap>()
  })

  it('StepContext.Output is BitMask instance', () => {
    expectTypeOf<T['Output']>().toEqualTypeOf<BitMask>()
  })

  it('StepContext config types remain independent of meta', () => {
    expectTypeOf<T['C']>().toEqualTypeOf<RawConfig>()
    expectTypeOf<T['SC']>().toEqualTypeOf<SerializedConfig>()
    expectTypeOf<T['RC']>().toEqualTypeOf<RC>()
  })
})

// ------------------------------------------------------------
// 2. Passthrough meta → EffectiveInput/Output + StepContext
// ------------------------------------------------------------

describe('StepMeta → Effective* and StepContext for passthrough steps', () => {
  const META = defineStepMeta({
    type: NodeType.STEP,
    def: 'passthrough',
    displayName: 'Passthrough',
    passthrough: true,
  })

  type M = typeof META
  type I = EffectiveInputConstructors<M>
  type O = EffectiveOutputConstructor<M>
  type T = StepContext<M, RawConfig, SerializedConfig, RC>

  it('EffectiveInputConstructors element type is PassThrough ctor', () => {
    type Elem = I[number]
    expectTypeOf<Elem>().toEqualTypeOf<typeof PassThrough>()
  })

  it('EffectiveOutputConstructor is PassThrough ctor', () => {
    expectTypeOf<O>().toEqualTypeOf<typeof PassThrough>()
  })

  it('StepContext.Input is PassThrough instance', () => {
    expectTypeOf<T['Input']>().toEqualTypeOf<PassThrough>()
  })

  it('StepContext.Output is PassThrough instance', () => {
    expectTypeOf<T['Output']>().toEqualTypeOf<PassThrough>()
  })
})

// ------------------------------------------------------------
// 3. AnyStepMeta compatibility with StepContext
// ------------------------------------------------------------

describe('AnyStepMeta compatibility with StepContext', () => {
  type M = AnyStepMeta
  type T = StepContext<M, RawConfig, SerializedConfig, RC>

  it('InputConstructors is some readonly array-like of constructors', () => {
    // we don’t care about exact shape here, just that it’s indexable
    expectTypeOf<T['InputConstructors'][number]>().toEqualTypeOf<StepDataType>()
  })

  it('Input is some instance type', () => {
    expectTypeOf<T['Input']>().toEqualTypeOf<StepDataTypeInstance>()
  })

  it('Output is some instance type', () => {
    expectTypeOf<T['Output']>().toEqualTypeOf<StepDataTypeInstance>()
  })
})
