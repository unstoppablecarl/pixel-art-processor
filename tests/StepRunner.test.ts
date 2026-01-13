import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import type { NodeDataType, StepInputTypesToInstances } from '../src/lib/pipeline/_types.ts'
import {
  type ForkRunner,
  type ForkRunnerInput,
  type NodeRunner,
  type NormalRunner,
  type NormalRunnerInput,
  type SingleRunnerResult,
} from '../src/lib/pipeline/NodeRunner.ts'
import type { NormalMap } from '../src/lib/step-data-types/NormalMap.ts'
import type { PixelMap } from '../src/lib/step-data-types/PixelMap.ts'

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

type IsEqual<A, B> =
  [A] extends [B]
    ? ([B] extends [A] ? true : false)
    : false

// Minimal mock StepContext-like shape for type-level testing
type MockStepContext<
  RC,
  InputConstructors extends readonly NodeDataType[],
  OutputConstructor extends NodeDataType,
> = {
  RC: RC
  InputConstructors: InputConstructors
  OutputConstructor: OutputConstructor

  Input: StepInputTypesToInstances<InputConstructors>
  Output: InstanceType<OutputConstructor>
}

type Ctx = MockStepContext<
  { foo: number },
  readonly [typeof PixelMap],
  typeof NormalMap
>

type InputInstance = Ctx['Input']
type OutputInstance = Ctx['Output']
type RC = Ctx['RC']

// ---------------------------------------------------------
// 1. Runner union structure
// ---------------------------------------------------------

describe('NodeRunner union structure', () => {
  it('NormalRunner<Input, Output, RC> is assignable to NodeRunner<Input, Output, RC>', () => {
    expectTypeOf<NormalRunner<InputInstance, OutputInstance, RC>>()
      .toExtend<NodeRunner<InputInstance, OutputInstance, RC>>()
  })

  it('ForkRunner<Input, Output, RC> is assignable to NodeRunner<Input, Output, RC>', () => {
    expectTypeOf<ForkRunner<InputInstance, OutputInstance, RC>>()
      .toExtend<NodeRunner<InputInstance, OutputInstance, RC>>()
  })
})

// ---------------------------------------------------------
// Manual narrowing works
// ---------------------------------------------------------

describe('Manual narrowing of NodeRunner<Input, Output, RC>', () => {
  it('can narrow to NormalRunner<Input, Output, RC>', () => {
    const run = {} as NodeRunner<InputInstance, OutputInstance, RC>
    const normal = run as NormalRunner<InputInstance, OutputInstance, RC>
    expectTypeOf(normal)
      .toExtend<NormalRunner<InputInstance, OutputInstance, RC>>()
  })

  it('can narrow to ForkRunner<Input, Output, RC>', () => {
    const run = {} as NodeRunner<InputInstance, OutputInstance, RC>
    const fork = run as ForkRunner<InputInstance, OutputInstance, RC>
    expectTypeOf(fork)
      .toExtend<ForkRunner<InputInstance, OutputInstance, RC>>()
  })
})

// ---------------------------------------------------------
// NodeRunner type behaviour
// ---------------------------------------------------------

describe('NodeRunner type collapse tests', () => {
  it('NormalRunner<Input, Output, RC> should NOT collapse to NodeRunner<Input, Output, RC>', () => {
    type N = NormalRunner<InputInstance, OutputInstance, RC>
    type U = NodeRunner<InputInstance, OutputInstance, RC>

    // N should be assignable to U
    type ShouldBeTrue = N extends U ? true : false
    expectTypeOf<ShouldBeTrue>().toEqualTypeOf<true>()

    // But U must NOT be assignable back to N
    type ShouldBeFalse = U extends N ? true : false
    expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>()
  })

  it('NodeRunner<Input, Output, RC> is exactly the union of Normal and Fork and they remain distinct', () => {
    type U = NodeRunner<InputInstance, OutputInstance, RC>
    type N = NormalRunner<InputInstance, OutputInstance, RC>
    type F = ForkRunner<InputInstance, OutputInstance, RC>

    // 1) U is exactly N | F
    type ExactUnion = N | F
    expectTypeOf<U>().toEqualTypeOf<ExactUnion>()

    // 2) N and F are not equal types
    type NEqualsF = IsEqual<N, F>
    expectTypeOf<NEqualsF>().toEqualTypeOf<false>()
  })

  it('NormalRunner<Input, Output, RC> has the correct call signature', () => {
    type N = NormalRunner<InputInstance, OutputInstance, RC>
    type ExpectedInput = NormalRunnerInput<InputInstance, RC>

    type Expected = (options: ExpectedInput) => Promise<any>

    expectTypeOf<N>().toExtend<Expected>()
  })

  it('ForkRunner<Input, Output, RC> has the correct call signature', () => {
    type F = ForkRunner<InputInstance, OutputInstance, RC>
    type ExpectedInput = ForkRunnerInput<InputInstance, RC>

    type Expected = (options: ExpectedInput) => Promise<any>

    expectTypeOf<F>().toExtend<Expected>()
  })

  it('SingleRunnerResult<Out> output matches Out | null', () => {
    type Result = SingleRunnerResult<OutputInstance>
    expectTypeOf<Result['output']>().toEqualTypeOf<OutputInstance | null>()
  })
})
