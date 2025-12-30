import { expectTypeOf } from 'expect-type'
import { describe, it } from 'vitest'
import type { AnyStepContext } from '../src/lib/pipeline/Step.ts'
import {
  type ForkStepRunner, type ForkStepRunnerOutput, type ForkStepRunnerResult,
  type NormalStepRunner,
  type NormalStepRunnerOutput, type NormalStepRunnerResult,
  type StepRunner, type StepRunnerResult, toForkStepRunnerResult, toNormalStepRunnerResult,
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
// 2. Raw runner outputs should NOT match StepRunnerResult
// ---------------------------------------------------------

describe('Raw runner outputs are narrower than StepRunnerResult', () => {
  it('NormalStepRunnerOutput is NOT assignable to StepRunnerResult', () => {
    expectTypeOf<NormalStepRunnerOutput<Out>>()
      .not.toMatchTypeOf<StepRunnerResult>()
  })

  it('ForkStepRunnerOutput is NOT assignable to StepRunnerResult', () => {
    expectTypeOf<ForkStepRunnerOutput<Out>>()
      .not.toMatchTypeOf<StepRunnerResult>()
  })
})

// ---------------------------------------------------------
// 3. Conversion functions produce narrowed results
// ---------------------------------------------------------

describe('Conversion functions produce correct narrowed results', () => {
  it('toNormalStepRunnerResult returns NormalStepRunnerResult<Out>', () => {
    const result = toNormalStepRunnerResult<Out>({ output: null })
    expectTypeOf(result).toMatchTypeOf<NormalStepRunnerResult<Out>>()
    expectTypeOf(result).toMatchTypeOf<StepRunnerResult>()
  })

  it('toForkStepRunnerResult returns ForkStepRunnerResult<Out>', () => {
    const result = toForkStepRunnerResult<Out>({ branchesOutput: [] })
    expectTypeOf(result).toMatchTypeOf<ForkStepRunnerResult<Out>>()
    expectTypeOf(result).toMatchTypeOf<StepRunnerResult>()
  })
})

// ---------------------------------------------------------
// 4. Narrowed results must be assignable to base result
// ---------------------------------------------------------

describe('Narrowed results extend StepRunnerResult', () => {
  it('NormalStepRunnerResult<Out> extends StepRunnerResult', () => {
    expectTypeOf<NormalStepRunnerResult<Out>>()
      .toMatchTypeOf<StepRunnerResult>()
  })

  it('ForkStepRunnerResult<Out> extends StepRunnerResult', () => {
    expectTypeOf<ForkStepRunnerResult<Out>>()
      .toMatchTypeOf<StepRunnerResult>()
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
