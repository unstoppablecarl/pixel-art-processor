import { describe, expectTypeOf, it } from 'vitest'
import type {
  AnyStepContext,
  ReactiveConfigType,
  StepContext,
  StepInputTypesToInstances,
} from '../src/lib/pipeline/Step'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import type { StepDataType } from '../src/steps.ts'

describe('basic type testing', async () => {

  it('StepContext types', () => {
    type FirstStep = StepContext<
      Record<string, any>,
      Record<string, any>,
      ReactiveConfigType<Record<string, any>>,
      readonly [],
      typeof HeightMap
    >

    expectTypeOf<FirstStep['Input']>().toEqualTypeOf(null)
    expectTypeOf<FirstStep['Output']>().toEqualTypeOf<HeightMap>()
    expectTypeOf<FirstStep>().toExtend<AnyStepContext>()

    type NormalStep = StepContext<
      Record<string, any>,
      Record<string, any>,
      ReactiveConfigType<Record<string, any>>,
      readonly [typeof BitMask, typeof NormalMap],
      typeof HeightMap
    >

    expectTypeOf<NormalStep['Input']>().toEqualTypeOf<BitMask | NormalMap>()
    expectTypeOf<NormalStep['Output']>().toEqualTypeOf<HeightMap>()
    expectTypeOf<NormalStep>().toExtend<AnyStepContext>()
  })

  it('StepInputTypesToInstances', () => {
    function tester<
      I extends readonly StepDataType[],
    >(
      options: {
        inputDataTypes: I,
      },
    ) {

      return {} as StepInputTypesToInstances<I>
    }

    const result = tester({
      inputDataTypes: [BitMask, NormalMap],
    })
    expectTypeOf(result).toEqualTypeOf<BitMask | NormalMap>()
  })
})