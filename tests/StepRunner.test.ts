import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import type { AnyStepContext, StepInputTypesToInstances } from '../src/lib/pipeline/Step.ts'
import {
  type ForkStepRunner,
  type NormalStepRunner, type SingleRunnerResult,
  type StepRunner,
} from '../src/lib/pipeline/StepRunner.ts'
import type { NormalMap } from '../src/lib/step-data-types/NormalMap.ts'
import type { PixelMap } from '../src/lib/step-data-types/PixelMap.ts'
import type { StepDataType } from '../src/steps.ts'

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

type T = AnyStepContext

type IsEqual<A, B> =
  [A] extends [B]
    ? ([B] extends [A] ? true : false)
    : false


// ---------------------------------------------------------
// 1. Runner union structure
// ---------------------------------------------------------

describe('StepRunner union structure', () => {
  it('NormalStepRunner<T> is assignable to StepRunner<T>', () => {
    expectTypeOf<NormalStepRunner<T>>().toExtend<StepRunner<T>>()
  })

  it('ForkStepRunner<T> is assignable to StepRunner<T>', () => {
    expectTypeOf<ForkStepRunner<T>>().toExtend<StepRunner<T>>()
  })
})

// ---------------------------------------------------------
// 5. Manual narrowing works
// ---------------------------------------------------------

describe('Manual narrowing of StepRunner<T>', () => {
  it('can narrow to NormalStepRunner<T>', () => {
    const run = {} as StepRunner<T>
    const normal = run as NormalStepRunner<T>
    expectTypeOf(normal).toExtend<NormalStepRunner<T>>()
  })

  it('can narrow to ForkStepRunner<T>', () => {
    const run = {} as StepRunner<T>
    const fork = run as ForkStepRunner<T>
    expectTypeOf(fork).toExtend<ForkStepRunner<T>>()
  })
})

// Minimal mock StepContext for type‑level testing
type MockStepContext<RC, Input extends readonly StepDataType[],
  Output extends StepDataType, > = {
  RC: RC
  C: RC
  SerializedConfig: RC

  InputConstructors: Input,
  OutputConstructors: Output,
  Output: InstanceType<Output>,
  Input: StepInputTypesToInstances<Input>,
}

type Ctx = MockStepContext<
  { foo: number },
  readonly [typeof PixelMap],
  typeof NormalMap
>

describe('StepRunner type collapse tests', () => {
  it('NormalStepRunner<T> should NOT collapse to StepRunner<T>', () => {
    type N = NormalStepRunner<Ctx>
    type U = StepRunner<Ctx>

    // If N collapses to U, this becomes false
    type ShouldBeTrue = N extends U ? true : false
    expectTypeOf<ShouldBeTrue>().toEqualTypeOf<true>()

    // But U must NOT be assignable back to N
    type ShouldBeFalse = U extends N ? true : false
    expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>()
  })


  it('StepRunner<T> is exactly the union of Normal and Fork and they remain distinct', () => {
    type U = StepRunner<Ctx>
    type N = NormalStepRunner<Ctx>
    type F = ForkStepRunner<Ctx>

    // 1) U is exactly N | F
    type ExactUnion = N | F
    expectTypeOf<U>().toEqualTypeOf<ExactUnion>()

    // 2) N and F are not equal types
    type NEqualsF = IsEqual<N, F>
    expectTypeOf<NEqualsF>().toEqualTypeOf<false>()
  })

  it('NormalStepRunner<Ctx> has the correct call signature', () => {
    type N = NormalStepRunner<Ctx>
    type Expected = (options: {
      config: Ctx['RC']
      inputData: Ctx['Input'] | null
    }) => Promise<any>

    expectTypeOf<N>().toExtend<Expected>()
  })

  it('ForkStepRunner<Ctx> has the correct call signature', () => {
    type F = ForkStepRunner<Ctx>
    type Expected = (options: {
      config: Ctx['RC']
      inputData: Ctx['Input'] | null
      branchIndex: number
    }) => Promise<any>

    expectTypeOf<F>().toExtend<Expected>()
  })

  it('SingleRunnerResult<T> output matches T["Output"] | null', () => {
    type Result = SingleRunnerResult<Ctx>
    expectTypeOf<Result['output']>().toEqualTypeOf<Ctx['Output'] | null>()
  })

})


