import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import type { IRunnerResultMeta, StepDataType } from '../src/lib/pipeline/_types.ts'
import type { AnyStepContext, StepInputTypesToInstances } from '../src/lib/pipeline/Step.ts'
import {
  type ForkRunner,
  type NormalRunner, type SingleRunnerResult,
  type NodeRunner,
} from '../src/lib/pipeline/NodeRunner.ts'
import type { NormalMap } from '../src/lib/step-data-types/NormalMap.ts'
import type { PixelMap } from '../src/lib/step-data-types/PixelMap.ts'

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

describe('NodeRunner union structure', () => {
  it('NormalStepRunner<T> is assignable to NodeRunner<T>', () => {
    expectTypeOf<NormalRunner<T>>().toExtend<NodeRunner<T>>()
  })

  it('ForkStepRunner<T> is assignable to NodeRunner<T>', () => {
    expectTypeOf<ForkRunner<T>>().toExtend<NodeRunner<T>>()
  })
})

// ---------------------------------------------------------
// 5. Manual narrowing works
// ---------------------------------------------------------

describe('Manual narrowing of NodeRunner<T>', () => {
  it('can narrow to NormalStepRunner<T>', () => {
    const run = {} as NodeRunner<T>
    const normal = run as NormalRunner<T>
    expectTypeOf(normal).toExtend<NormalRunner<T>>()
  })

  it('can narrow to ForkStepRunner<T>', () => {
    const run = {} as NodeRunner<T>
    const fork = run as ForkRunner<T>
    expectTypeOf(fork).toExtend<ForkRunner<T>>()
  })
})

// Minimal mock StepContext for type‑level testing
type MockStepContext<RC, Input extends readonly StepDataType[],
  Output extends StepDataType, > = {
  RC: RC
  C: RC
  SC: RC

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

describe('NodeRunner type collapse tests', () => {
  it('NormalStepRunner<T> should NOT collapse to NodeRunner<T>', () => {
    type N = NormalRunner<Ctx>
    type U = NodeRunner<Ctx>

    // If N collapses to U, this becomes false
    type ShouldBeTrue = N extends U ? true : false
    expectTypeOf<ShouldBeTrue>().toEqualTypeOf<true>()

    // But U must NOT be assignable back to N
    type ShouldBeFalse = U extends N ? true : false
    expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>()
  })


  it('NodeRunner<T> is exactly the union of Normal and Fork and they remain distinct', () => {
    type U = NodeRunner<Ctx>
    type N = NormalRunner<Ctx>
    type F = ForkRunner<Ctx>

    // 1) U is exactly N | F
    type ExactUnion = N | F
    expectTypeOf<U>().toEqualTypeOf<ExactUnion>()

    // 2) N and F are not equal types
    type NEqualsF = IsEqual<N, F>
    expectTypeOf<NEqualsF>().toEqualTypeOf<false>()
  })

  it('NormalStepRunner<Ctx> has the correct call signature', () => {
    type N = NormalRunner<Ctx>
    type Expected = (options: {
      config: Ctx['RC']
      inputData: Ctx['Input'] | null,
      inputPreview: ImageData | null,
      meta: IRunnerResultMeta,
    }) => Promise<any>

    expectTypeOf<N>().toExtend<Expected>()
  })

  it('ForkStepRunner<Ctx> has the correct call signature', () => {
    type F = ForkRunner<Ctx>
    type Expected = (options: {
      config: Ctx['RC']
      inputData: Ctx['Input'] | null
      inputPreview: ImageData | null,
      branchIndex: number,
      branchGenerationSeed: number,
      meta: IRunnerResultMeta,
    }) => Promise<any>

    expectTypeOf<F>().toExtend<Expected>()
  })

  it('SingleRunnerResult<T> output matches T["Output"] | null', () => {
    type Result = SingleRunnerResult<Ctx>
    expectTypeOf<Result['output']>().toEqualTypeOf<Ctx['Output'] | null>()
  })

})


