import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import type { AnyStepContext, StepInputTypesToInstances } from '../src/lib/pipeline/Step.ts'
import {
  type AnyStepRunnerResult,
  type ForkStepRunner,
  type ForkStepRunnerOutput,
  type ForkStepRunnerResult,
  type NormalStepRunner,
  type NormalStepRunnerResult,
  type StepRunner,
} from '../src/lib/pipeline/StepRunner.ts'
import type { NormalMap } from '../src/lib/step-data-types/NormalMap.ts'
import type { PixelMap } from '../src/lib/step-data-types/PixelMap.ts'
import type { StepDataType } from '../src/steps.ts'

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

type T = AnyStepContext

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
// 2. Raw runner outputs should NOT match AnyStepRunnerResult
// ---------------------------------------------------------

describe('Raw runner outputs are narrower than AnyStepRunnerResult', () => {
  it('NormalStepRunnerOutput is NOT assignable to AnyStepRunnerResult', () => {
    expectTypeOf<NormalStepRunnerResult<T>>()
      .not.toEqualTypeOf<AnyStepRunnerResult<AnyStepContext>>()
  })

  it('ForkStepRunnerOutput is NOT assignable to AnyStepRunnerResult', () => {
    expectTypeOf<ForkStepRunnerOutput<T>>()
      .not.toEqualTypeOf<AnyStepRunnerResult<AnyStepContext>>()
  })
})

// ---------------------------------------------------------
// 4. Narrowed results must be assignable to base result
// ---------------------------------------------------------

describe('Narrowed results extend AnyStepRunnerResult', () => {
  it('NormalStepRunnerResult<Out> extends AnyStepRunnerResult', () => {
    expectTypeOf<NormalStepRunnerResult<T>>()
      .toExtend<AnyStepRunnerResult<T>>()
  })

  it('ForkStepRunnerResult<Out> extends AnyStepRunnerResult', () => {
    expectTypeOf<ForkStepRunnerResult<T>>()
      .toExtend<AnyStepRunnerResult<T>>()
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
  Output extends StepDataType,> = {
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
  readonly [ typeof PixelMap],
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

  it('ForkStepRunner<T> should NOT collapse to StepRunner<T>', () => {
    type F = ForkStepRunner<Ctx>
    type U = StepRunner<Ctx>

    type ShouldBeTrue = F extends U ? true : false
    expectTypeOf<ShouldBeTrue>().toEqualTypeOf<true>()

    type ShouldBeFalse = U extends F ? true : false
    expectTypeOf<ShouldBeFalse>().toEqualTypeOf<false>()
  })

  it('NormalStepRunner<T> and ForkStepRunner<T> should remain distinct', () => {
    type N = NormalStepRunner<Ctx>
    type F = ForkStepRunner<Ctx>

    type NtoF = N extends F ? true : false
    type FtoN = F extends N ? true : false

    expectTypeOf<NtoF>().toEqualTypeOf<false>()
    expectTypeOf<FtoN>().toEqualTypeOf<false>()
  })

  it('StepRunner<T> should remain a proper union, not collapse to a single type', () => {
    type U = StepRunner<Ctx>
    type N = NormalStepRunner<Ctx>
    type F = ForkStepRunner<Ctx>

    // U must accept both
    expectTypeOf<N>().toMatchTypeOf<U>()
    expectTypeOf<F>().toMatchTypeOf<U>()

    // But U must NOT be assignable to either subtype
    type UtoN = U extends N ? true : false
    type UtoF = U extends F ? true : false

    expectTypeOf<UtoN>().toEqualTypeOf<false>()
    expectTypeOf<UtoF>().toEqualTypeOf<false>()
  })
})


