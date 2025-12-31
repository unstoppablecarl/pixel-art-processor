import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import type { AnyStepContext } from '../src/lib/pipeline/Step.ts'
import {
  type ForkStepRunner, type ForkStepRunnerOutput, type ForkStepRunnerResult,
  type NormalStepRunner,
  type NormalStepRunnerOutput, type NormalStepRunnerResult,
  type StepRunner, type AnyStepRunnerResult, toForkStepRunnerResult, toNormalStepRunnerResult,
} from '../src/lib/pipeline/StepRunner.ts'

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

type T = AnyStepContext
type Out = T['Output']

// ---------------------------------------------------------
// 1. Runner union structure
// ---------------------------------------------------------

describe('StepRunner union structure', () => {
  it('NormalStepRunner<T> is assignable to StepRunner<T>', () => {
    expectTypeOf<NormalStepRunner<T>>().toMatchTypeOf<StepRunner<T>>()
  })

  it('ForkStepRunner<T> is assignable to StepRunner<T>', () => {
    expectTypeOf<ForkStepRunner<T>>().toMatchTypeOf<StepRunner<T>>()
  })
})

// ---------------------------------------------------------
// 2. Raw runner outputs should NOT match AnyStepRunnerResult
// ---------------------------------------------------------

describe('Raw runner outputs are narrower than AnyStepRunnerResult', () => {
  it('NormalStepRunnerOutput is NOT assignable to AnyStepRunnerResult', () => {
    expectTypeOf<NormalStepRunnerOutput<Out>>()
      .not.toMatchTypeOf<AnyStepRunnerResult>()
  })

  it('ForkStepRunnerOutput is NOT assignable to AnyStepRunnerResult', () => {
    expectTypeOf<ForkStepRunnerOutput<Out>>()
      .not.toMatchTypeOf<AnyStepRunnerResult>()
  })
})

// ---------------------------------------------------------
// 3. Conversion functions produce narrowed results
// ---------------------------------------------------------

describe('Conversion functions produce correct narrowed results', () => {
  it('toNormalStepRunnerResult returns NormalStepRunnerResult<Out>', () => {
    const result = toNormalStepRunnerResult<Out>({ output: null })
    expectTypeOf(result).toMatchTypeOf<NormalStepRunnerResult<Out>>()
    expectTypeOf(result).toMatchTypeOf<AnyStepRunnerResult>()
  })

  it('toForkStepRunnerResult returns ForkStepRunnerResult<Out>', () => {
    const result = toForkStepRunnerResult<Out>({ branchesOutput: [] })
    expectTypeOf(result).toMatchTypeOf<ForkStepRunnerResult<Out>>()
    expectTypeOf(result).toMatchTypeOf<AnyStepRunnerResult>()
  })
})

// ---------------------------------------------------------
// 4. Narrowed results must be assignable to base result
// ---------------------------------------------------------

describe('Narrowed results extend AnyStepRunnerResult', () => {
  it('NormalStepRunnerResult<Out> extends AnyStepRunnerResult', () => {
    expectTypeOf<NormalStepRunnerResult<Out>>()
      .toMatchTypeOf<AnyStepRunnerResult>()
  })

  it('ForkStepRunnerResult<Out> extends AnyStepRunnerResult', () => {
    expectTypeOf<ForkStepRunnerResult<Out>>()
      .toMatchTypeOf<AnyStepRunnerResult>()
  })
})

// ---------------------------------------------------------
// 5. Manual narrowing works
// ---------------------------------------------------------

describe('Manual narrowing of StepRunner<T>', () => {
  it('can narrow to NormalStepRunner<T>', () => {
    const run = {} as StepRunner<T>
    const normal = run as NormalStepRunner<T>
    expectTypeOf(normal).toMatchTypeOf<NormalStepRunner<T>>()
  })

  it('can narrow to ForkStepRunner<T>', () => {
    const run = {} as StepRunner<T>
    const fork = run as ForkStepRunner<T>
    expectTypeOf(fork).toMatchTypeOf<ForkStepRunner<T>>()
  })
})
