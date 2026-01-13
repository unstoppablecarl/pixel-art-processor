import { describe, expectTypeOf, it } from 'vitest'
import type { NodeDataTypeInstance } from '../src/lib/node-data-types/_node-data-types.ts'
import type { BitMask } from '../src/lib/node-data-types/BitMask.ts'
import { NodeType } from '../src/lib/pipeline/_types.ts'
import {
  type InitializedBranchNode,
  type InitializedForkNode,
  type InitializedStepNode,
  type StepNode,
} from '../src/lib/pipeline/Node.ts'
import type { StepHandler } from '../src/lib/pipeline/NodeHandler/StepHandler.ts'
import type { SingleRunnerOutput } from '../src/lib/pipeline/NodeRunner.ts'
import type {
  AnyBranchMeta,
  AnyForkMeta,
  AnyStepMeta,
  NormalStepMeta,
  PassthroughStepMeta,
  StepMetaIO,
} from '../src/lib/pipeline/types/definitions.ts'

type StepMeta = AnyStepMeta<readonly [typeof BitMask], typeof BitMask>
type ForkMeta = AnyForkMeta<readonly [typeof BitMask], typeof BitMask>
type BranchMeta = AnyBranchMeta<readonly [typeof BitMask], typeof BitMask>

type StepN = StepNode<{}, {}, {}, StepMeta>

type InitStep = InitializedStepNode<{}, {}, {}, StepMeta>
type InitFork = InitializedForkNode<{}, {}, {}, ForkMeta>
type InitBranch = InitializedBranchNode<{}, {}, {}, BranchMeta>

describe('node handlers', () => {

  it('StepNode has an optional handler of the right shape', () => {
    expectTypeOf<StepN['handler']>().toEqualTypeOf<
      StepHandler<{}, {}, {}, StepMeta> | undefined
    >()
  })

  it('InitializedStepNode has a required handler with the right meta', () => {
    expectTypeOf<InitStep['handler']['meta']>().toEqualTypeOf<StepMeta>()
  })

  it('InitializedForkNode has the correct meta on handler', () => {
    expectTypeOf<InitFork['handler']['meta']>().toEqualTypeOf<ForkMeta>()
  })

  it('InitializedBranchNode has the correct meta on handler', () => {
    expectTypeOf<InitBranch['handler']['meta']>().toEqualTypeOf<BranchMeta>()
  })

  it('StepHandler infers correct input/output types from meta', () => {
    type H = StepHandler<{}, {}, {}, StepMeta>
    type I = readonly [typeof BitMask]
    type O = typeof BitMask

    type Run = H['run']
    type InferredInput = Parameters<Run>[0]['inputData']
    type InferredOutput = ReturnType<Run>

    expectTypeOf<InferredInput>().toEqualTypeOf<InstanceType<
      StepMetaIO<NormalStepMeta<I, O> | PassthroughStepMeta>[1]
    > | null>()

    expectTypeOf<InferredOutput>().toEqualTypeOf<
      Promise<
        SingleRunnerOutput<
          InstanceType<
            StepMetaIO<NormalStepMeta<I, O> | PassthroughStepMeta>[1]
          >
        >
      >
    >()
  })

  it('Node kind discriminates by handler.meta.type (initialized)', () => {
    type AnyInit =
      | InitStep
      | InitFork
      | InitBranch

    type StepOnly = Extract<AnyInit, { handler: { meta: { type: NodeType.STEP } } }>
    type ForkOnly = Extract<AnyInit, { handler: { meta: { type: NodeType.FORK } } }>
    type BranchOnly = Extract<AnyInit, { handler: { meta: { type: NodeType.BRANCH } } }>

    expectTypeOf<StepOnly>().toEqualTypeOf<InitStep>()
    expectTypeOf<ForkOnly>().toEqualTypeOf<InitFork>()
    expectTypeOf<BranchOnly>().toEqualTypeOf<InitBranch>()
  })

  it('infers normal meta I/O', () => {

    type StepMeta = NormalStepMeta<readonly [typeof BitMask], typeof BitMask>
    type InitStep = InitializedStepNode<{}, {}, {}, StepMeta>
    type ExpectedInputTypes = readonly [typeof BitMask]
    type ExpectedOutputType = typeof BitMask

    expectTypeOf<
      InitStep['handler']['meta']['inputDataTypes']
    >().toEqualTypeOf<ExpectedInputTypes>()

    expectTypeOf<
      InitStep['handler']['meta']['outputDataType']
    >().toEqualTypeOf<ExpectedOutputType>()
  })

  it('infers passthrough meta I/O', () => {
    type StepMeta = PassthroughStepMeta
    type InitStep = InitializedStepNode<{}, {}, {}, StepMeta>

    expectTypeOf<
      InitStep['handler']['meta']['inputDataTypes']
    >().toEqualTypeOf<undefined>()

    expectTypeOf<
      InitStep['handler']['meta']['outputDataType']
    >().toEqualTypeOf<undefined>()

    type H = StepHandler<{}, {}, {}, StepMeta>

    type Run = H['run']
    type InferredInput = Parameters<Run>[0]['inputData']
    type InferredOutput = ReturnType<Run>

    expectTypeOf<InferredInput>().toEqualTypeOf<NodeDataTypeInstance | null>()

    expectTypeOf<InferredOutput>().toEqualTypeOf<
      Promise<
        SingleRunnerOutput<
          NodeDataTypeInstance
        >
      >
    >()
  })
})