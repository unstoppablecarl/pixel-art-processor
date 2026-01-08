import { describe, expect, it, vi } from 'vitest'
import { Component } from 'vue'
import type { AnyStepDefinition, NodeDef, NodeId, StepDataType } from '../src/lib/pipeline/_types'
import { NodeType } from '../src/lib/pipeline/_types'
import { BranchNode, ForkNode, StepNode } from '../src/lib/pipeline/Node.ts'
import type { AnyStepContext } from '../src/lib/pipeline/Step'
import type { StepHandlerOptions } from '../src/lib/pipeline/StepHandler'
import { installStepRegistry, makeStepRegistry, useStepRegistry } from '../src/lib/pipeline/StepRegistry'
import { PassThrough } from '../src/lib/step-data-types/PassThrough'
import type { PipelineStore } from '../src/lib/store/pipeline-store'
import { deepUnwrap } from '../src/lib/util/vue-util.ts'

// ------------------------------------------------------------
// Install fresh registry
// ------------------------------------------------------------
installStepRegistry(makeStepRegistry())

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const nid = (s: string) => s as NodeId

interface Ctx extends AnyStepContext {
  Input: number | null
  Output: number | null
  RC: { value: number }
  SerializedConfig: { value: number }
}

function makeStore(nodes: Record<NodeId, any>): PipelineStore {
  return {
    nodes,
    get(id: NodeId) {
      return nodes[id]
    },
    nodeIsPassthrough() {
      return false
    },
  } as unknown as PipelineStore
}

function defineStep({
                      def,
                      displayName = 'Testing',
                      type = NodeType.STEP,
                      passthrough,
                      inputDataTypes,
                      outputDataType,
                      branchDefs = [],
                    }: {
  def: string
  displayName?: string
  type?: NodeType
  branchDefs?: string[]
} & (
  | { passthrough: true; inputDataTypes?: undefined; outputDataType?: undefined }
  | { passthrough?: false; inputDataTypes: readonly StepDataType[]; outputDataType: StepDataType }
  )) {
  return useStepRegistry().defineStep({
    displayName,
    def: def as NodeDef,
    type,
    inputDataTypes,
    outputDataType,
    branchDefs: branchDefs,
    passthrough,
    component: {} as unknown as Component,
  } as AnyStepDefinition)
}

// ------------------------------------------------------------
// Register step definitions
// ------------------------------------------------------------

// Passthrough node
const passthroughDef: NodeDef = 'passthrough-step' as any
defineStep({
  def: passthroughDef,
  passthrough: true,
})

// Typed node
const typedDef: NodeDef = 'typed-step' as any
defineStep({
  def: typedDef,
  passthrough: false,
  inputDataTypes: [PassThrough],
  outputDataType: PassThrough,
})

// ------------------------------------------------------------
// Handler options matching definitions
// ------------------------------------------------------------

const passthroughHandlerOptions: StepHandlerOptions<Ctx> = {
  passthrough: true,
  run: vi.fn(async ({ inputData }) => ({
    output: (inputData),
    preview: null,
    meta: null,
    validationErrors: [],
  })),
}

const typedHandlerOptions: StepHandlerOptions<Ctx> = {
  passthrough: false,
  inputDataTypes: [PassThrough],
  outputDataType: PassThrough,
  run: vi.fn(async ({ inputData }) => ({
    output: (inputData ?? 0) + 1,
    preview: null,
    meta: null,
    validationErrors: [],
  })),
}

// ------------------------------------------------------------
// TYPE SANITY
// ------------------------------------------------------------

describe('Node type sanity', () => {
  it('StepNode initializes', () => {
    const s = new StepNode<Ctx>({
      id: nid('s'),
      def: passthroughDef,
      config: { value: 1 },
    })
    s.initializeStep(passthroughHandlerOptions)
    expect(s.type).toBe(NodeType.STEP)
  })
})

// ------------------------------------------------------------
// isReady / outputReady
// ------------------------------------------------------------

describe('isReady / outputReady', () => {
  it('outputReady returns true only when clean, not processing, initialized', () => {
    const s = new StepNode<Ctx>({
      id: nid('s'),
      def: passthroughDef,
      config: { value: 1 },
    })
    s.initializeStep(passthroughHandlerOptions)

    s.isDirty = false
    s.isProcessing = false
    s.initialized = true

    expect(s.outputReady()).toBe(true)

    s.isDirty = true
    expect(s.outputReady()).toBe(false)
  })

  it('isReady requires prev outputReady when prevNodeId exists', () => {
    const s0 = new StepNode<Ctx>({
      id: nid('s0'),
      def: passthroughDef,
      config: { value: 1 },
    })
    const s1 = new StepNode<Ctx>({
      id: nid('s1'),
      def: passthroughDef,
      config: { value: 1 },
    })

    s1.prevNodeId = nid('s0')

    s0.initializeStep(passthroughHandlerOptions)
    s1.initializeStep(passthroughHandlerOptions)

    s0.isDirty = false
    s0.isProcessing = false
    s0.initialized = true

    s1.isDirty = true
    s1.isProcessing = false
    s1.initialized = true

    const store = makeStore({
      [nid('s0')]: s0,
      [nid('s1')]: s1,
    })

    expect(s1.isReady(store)).toBe(true)

    s0.isDirty = true
    expect(s1.isReady(store)).toBe(false)
  })
})

// ------------------------------------------------------------
// serialize() using loadSerialized?.config
// ------------------------------------------------------------

describe('serialize loadSerialized config', () => {
  it('serialize uses loadSerialized.config when handler not initialized', () => {
    const s = new StepNode<Ctx>({
      id: nid('s'),
      def: passthroughDef,
      config: { value: 123 },
    })

    const ser = s.serialize()
    expect(ser.config).toEqual({ value: 123 })
  })
})

// ------------------------------------------------------------
// seedSum accumulation
// ------------------------------------------------------------

describe('seedSum accumulation', () => {
  it('accumulates seedSum from previous nodes', async () => {
    const s0 = new StepNode<Ctx>({
      id: nid('s0'),
      def: passthroughDef,
      config: { value: 1 },
      seed: 5,
    })

    const s1 = new StepNode<Ctx>({
      id: nid('s1'),
      def: passthroughDef,
      config: { value: 1 },
      seed: 7,
    })

    s1.prevNodeId = nid('s0')

    const store = makeStore({
      [nid('s0')]: s0,
      [nid('s1')]: s1,
    })

    s0.initializeStep(passthroughHandlerOptions)

    s0.getSeedSum(store)

    expect(s0.seed).toEqual(5)
    expect(s0.getSeedSum(store)).toEqual(5)
    expect(s0.seedSum).toEqual(5)

    expect(s1.seed).toEqual(7)
    expect(s1.getSeedSum(store)).toEqual(12)
    expect(s1.seedSum).toEqual(12)
  })
})

// ------------------------------------------------------------
// getOutputSize
// ------------------------------------------------------------

describe('getOutputSize', () => {
  it('StepNode getOutputSize returns width/height from outputData', () => {
    const s = new StepNode<Ctx>({
      id: nid('s'),
      def: passthroughDef,
      config: { value: 1 },
    })
    s.initializeStep(passthroughHandlerOptions)

    s.outputData = { width: 50, height: 30 } as any
    expect(s.getOutputSize()).toEqual({ width: 50, height: 30 })
  })

  it('ForkNode getOutputSize returns first branch output size', async () => {
    const f = new ForkNode<Ctx>({
      id: nid('f'),
      def: passthroughDef,
      branchIds: [nid('b0')],
    })

    const s0 = new StepNode<Ctx>({
      id: nid('s0'),
      def: passthroughDef,
      config: { value: 1 },
    })

    const b0 = new BranchNode<Ctx>({
      id: nid('b0'),
      prevNodeId: f.id,
      def: passthroughDef,
      branchIndex: 0,
    })

    f.prevNodeId = nid('s0')

    s0.initializeStep(passthroughHandlerOptions)
    f.initializeFork(passthroughHandlerOptions)

    s0.outputData = { width: 10, height: 20 } as any
    s0.isDirty = false
    s0.initialized = true

    const store = makeStore({
      [nid('f')]: f,
      [nid('s0')]: s0,
      [nid('b0')]: b0,
    })

    f.isDirty = true
    await f.processRunner(store)

    expect(deepUnwrap(f.forkOutputData)).toEqual([
        {
          'meta': {},
          'output': {
            'width': 10,
            'height': 20,
          },
          'preview': null,
          'validationErrors': [],
        },
      ],
    )

    expect(f.getOutputSize()).toEqual({ width: 10, height: 20 })
  })
})

// ------------------------------------------------------------
// Fork serialize
// ------------------------------------------------------------

describe('ForkNode serialize', () => {
  it('serializes prevNodeId and branchIds', () => {
    const f = new ForkNode<Ctx>({
      id: nid('f'),
      def: passthroughDef,
      branchIds: [nid('b0'), nid('b1')],
      prevNodeId: nid('s0'),
    })

    f.initializeFork(passthroughHandlerOptions)

    const ser = f.serialize()
    expect(ser.prevNodeId).toBe(nid('s0'))
    expect(ser.branchIds).toEqual([nid('b0'), nid('b1')])
  })
})

// ------------------------------------------------------------
// Branch serialize
// ------------------------------------------------------------

describe('BranchNode serialize', () => {
  it('serializes prevNodeId and branchIndex', () => {
    const b = new BranchNode<Ctx>({
      id: nid('b'),
      def: passthroughDef,
      prevNodeId: nid('f'),
      branchIndex: 2,
    })

    b.initializeBranch(passthroughHandlerOptions)

    const ser = b.serialize()
    expect(ser.prevNodeId).toBe(nid('f'))
    expect(ser.branchIndex).toBe(2)
  })
})

// ------------------------------------------------------------
// Passthrough nodes
// ------------------------------------------------------------

describe('Passthrough nodes', () => {
  it('StepNode in passthrough mode forwards input type', async () => {
    const s0 = new StepNode<Ctx>({
      id: nid('s0'),
      def: passthroughDef,
      config: { value: 1 },
    })

    const s1 = new StepNode<Ctx>({
      id: nid('s1'),
      def: passthroughDef,
      config: { value: 1 },
    })

    s1.prevNodeId = nid('s0')

    s0.initializeStep(passthroughHandlerOptions)
    s1.initializeStep(passthroughHandlerOptions)

    s0.outputData = 9
    s0.isDirty = false
    s0.initialized = true

    const store = makeStore({
      [nid('s0')]: s0,
      [nid('s1')]: s1,
    })

    s1.isDirty = true
    await s1.processRunner(store)

    expect(s1.outputData).toBe(9)
  })
})

// ------------------------------------------------------------
// Typed input/output nodes
// ------------------------------------------------------------

describe('Typed input/output nodes', () => {
  it('StepNode with typedDef respects input/output types', async () => {
    const s0 = new StepNode<Ctx>({
      id: nid('s0'),
      def: typedDef,
      config: { value: 1 },
    })

    const s1 = new StepNode<Ctx>({
      id: nid('s1'),
      def: typedDef,
      config: { value: 1 },
    })

    s1.prevNodeId = nid('s0')

    s0.initializeStep(typedHandlerOptions)
    s1.initializeStep(typedHandlerOptions)

    s0.outputData = 20
    s0.isDirty = false
    s0.initialized = true

    const store = makeStore({
      [nid('s0')]: s0,
      [nid('s1')]: s1,
    })

    s1.isDirty = true
    await s1.processRunner(store)

    expect(s1.outputData).toBe(21)
  })
})
