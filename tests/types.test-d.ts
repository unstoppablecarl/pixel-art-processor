import { describe, expectTypeOf, it } from 'vitest'
import { type ShallowReactive, shallowReactive } from 'vue'
import type {
  AnyStepContext,
  ReactiveConfigType,
  StepContext,
  StepInputTypesToInstances,
} from '../src/lib/pipeline/Step'
import type { Config } from '../src/lib/pipeline/StepHandler.ts'
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

  it('useStepHandler Config raw', () => {

    function tester<
      RC extends ReactiveConfigType<C>,
      C extends Config = RC extends ReactiveConfigType<infer U> ? U : never,
    >(
      options: {
        config: () => RC,
      },
    ) {

      return {
        config: options.config() as RC,
      }
    }

    const result = tester({
      config: () => {
        return shallowReactive({
          name: 'foo',
        })
      },
    })

    expectTypeOf(result.config).toEqualTypeOf<ShallowReactive<{
      name: string
    }>>()

  })

  it('useStepHandler Config StepContext', () => {

    function tester<
      RC extends ReactiveConfigType<C>,
      C extends Config = RC extends ReactiveConfigType<infer U> ? U : never,
    >(
      options: {
        config: () => RC,
      },
    ) {


      type T = StepContext<C, C, RC>
      return {
        config: options.config() as T['RC'],
      }
    }

    const result = tester({
      config: () => {
        return shallowReactive({
          name: 'foo',
        })
      },
    })

    expectTypeOf(result.config).toEqualTypeOf<ShallowReactive<{
      name: string
    }>>()

  })
})