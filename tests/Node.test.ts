import { describe, expect, it, vi } from 'vitest'
import { type Component, reactive } from 'vue'
import { defineStepMeta, type NodeDef, type NodeId, NodeType } from '../src/lib/pipeline/_types'
import { BranchNode, ForkNode, StepNode } from '../src/lib/pipeline/Node'
import type { NormalRunner } from '../src/lib/pipeline/NodeRunner'
import type { ReactiveConfigType, StepContext } from '../src/lib/pipeline/Step'
import type { StepHandlerOptions } from '../src/lib/pipeline/StepHandler'
import { makeStepHandler } from '../src/lib/pipeline/StepHandler'
import { installStepRegistry, makeStepRegistry, useStepRegistry } from '../src/lib/pipeline/StepRegistry'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { PassThrough } from '../src/lib/step-data-types/PassThrough'
import type { PipelineStore } from '../src/lib/store/pipeline-store'

// ------------------------------------------------------------
// Registry setup
// ------------------------------------------------------------
installStepRegistry(makeStepRegistry())

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const nid = (s: string) => s as NodeId

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

// ------------------------------------------------------------
// Step definitions
// ------------------------------------------------------------

const passthroughDef = 'passthrough-step' as NodeDef
const passThroughMeta = defineStepMeta({
  type: NodeType.STEP,
  def: passthroughDef,
  displayName: 'testing',
  passthrough: true,
})

useStepRegistry().defineStep({
  ...passThroughMeta,
  component: {} as Component,
})

const typedDef = 'typed-step' as NodeDef
const basicMeta = defineStepMeta({
  type: NodeType.STEP,
  def: typedDef,
  displayName: 'testing2',
  passthrough: false,
  inputDataTypes: [PassThrough],
  outputDataType: PassThrough,
})

useStepRegistry().defineStep({
  ...basicMeta,
  component: {} as Component,
})

// ------------------------------------------------------------
// Config types
// ------------------------------------------------------------

type RawConfig = { value: number }
type SerializedConfig = { value: number }
type RC = ReactiveConfigType<RawConfig>

type TPass = StepContext<
  typeof passThroughMeta,
  RawConfig,
  SerializedConfig,
  RC
>

// ------------------------------------------------------------
// Handler options
// ------------------------------------------------------------

type TPassthrough = StepContext<
  typeof passThroughMeta,
  RawConfig,
  SerializedConfig,
  RC
>

const passthroughHandlerOptions: StepHandlerOptions<
  typeof passThroughMeta,
  RawConfig,
  SerializedConfig,
  RC,
  NormalRunner<TPassthrough>
> = {
  config() {
    return { value: 2 }
  },
  reactiveConfig(defaults) {
    return reactive(defaults)
  },
  async run({ inputData }) {
    return {
      output: inputData,
      preview: null,
      meta: null,
      validationErrors: [],
    }
  },
}

const typedHandlerOptions: StepHandlerOptions<
  typeof basicMeta,
  RawConfig,
  SerializedConfig,
  RC,
  NormalRunner<TPassthrough>
> = {
  config() {
    return { value: 1 }
  },
  reactiveConfig(defaults) {
    return reactive(defaults)
  },
  run: vi.fn(async ({ inputData }) => ({
    output: (inputData),
    preview: null,
    meta: null,
    validationErrors: [],
  })),
}
type TTyped = StepContext<
  typeof basicMeta,
  RawConfig,
  SerializedConfig,
  RC
>


// ------------------------------------------------------------
// TESTS
// ------------------------------------------------------------

describe('Pipeline Node Behavior', () => {
  // ------------------------------------------------------------
  // isReady / outputReady
  // ------------------------------------------------------------
  describe('isReady / outputReady', () => {
    it('outputReady returns true only when clean, not processing, initialized', () => {
      const s = new StepNode<typeof passThroughMeta, TPass>({
        id: nid('s'),
        def: passthroughDef,
        config: { value: 1 },
      })

      const handler = makeStepHandler(passThroughMeta, passthroughHandlerOptions)
      s.initialize(handler)

      s.isDirty = false
      s.isProcessing = false
      s.initialized = true

      expect(s.outputReady()).toBe(true)

      s.isDirty = true
      expect(s.outputReady()).toBe(false)
    })

    it('isReady requires prev outputReady when prevNodeId exists', () => {
      const s0 = new StepNode<typeof passThroughMeta, TPass>({
        id: nid('s0'),
        def: passthroughDef,
        config: { value: 1 },
      })
      const s1 = new StepNode<typeof passThroughMeta, TPass>({
        id: nid('s1'),
        def: passthroughDef,
        config: { value: 1 },
      })

      s1.prevNodeId = nid('s0')

      const handler = makeStepHandler(passThroughMeta, passthroughHandlerOptions)
      s0.initialize(handler)
      s1.initialize(handler)

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
    it('serialize uses initial config when handler not initialized', () => {
      const s = new StepNode<typeof passThroughMeta, TPass>({
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
    it('accumulates seedSum from previous nodes', () => {
      const s0 = new StepNode<typeof passThroughMeta, TPass>({
        id: nid('s0'),
        def: passthroughDef,
        config: { value: 1 },
        seed: 5,
      })

      const s1 = new StepNode<typeof passThroughMeta, TPass>({
        id: nid('s1'),
        def: passthroughDef,
        config: { value: 1 },
        seed: 7,
      })

      s1.prevNodeId = nid('s0')

      const handler = makeStepHandler(passThroughMeta, passthroughHandlerOptions)
      s0.initialize(handler)

      const store = makeStore({
        [nid('s0')]: s0,
        [nid('s1')]: s1,
      })

      expect(s0.getSeedSum(store)).toEqual(5)
      expect(s1.getSeedSum(store)).toEqual(12)
    })
  })

  // ------------------------------------------------------------
  // Fork serialize
  // ------------------------------------------------------------
  describe('ForkNode serialize', () => {
    it('serializes prevNodeId and branchIds', () => {
      const f = new ForkNode<typeof passThroughMeta, TPass>({
        id: nid('f'),
        def: passthroughDef,
        branchIds: [nid('b0'), nid('b1')],
        prevNodeId: nid('s0'),
      })

      const handler = makeStepHandler(passThroughMeta, passthroughHandlerOptions)
      f.initialize(handler)

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
      const b = new BranchNode<typeof passThroughMeta, TPass>({
        id: nid('b'),
        def: passthroughDef,
        prevNodeId: nid('f'),
        branchIndex: 2,
      })

      const handler = makeStepHandler(passThroughMeta, passthroughHandlerOptions)
      b.initialize(handler)

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
      const s0 = new StepNode<typeof passThroughMeta, TPass>({
        id: nid('s0'),
        def: passthroughDef,
        config: { value: 1 },
      })

      const s1 = new StepNode<typeof passThroughMeta, TPass>({
        id: nid('s1'),
        def: passthroughDef,
        config: { value: 1 },
      })

      s1.prevNodeId = nid('s0')

      const handler = makeStepHandler(passThroughMeta, passthroughHandlerOptions)
      s0.initialize(handler)
      s1.initialize(handler)

      const bitMask = new BitMask(1, 1)
      s0.outputData = bitMask as unknown as PassThrough
      s0.isDirty = false
      s0.initialized = true

      const store = makeStore({
        [nid('s0')]: s0,
        [nid('s1')]: s1,
      })

      s1.isDirty = true
      await s1.processRunner(store)

      expect(s1.outputData).toBe(bitMask)
    })
  })

  describe('Typed input/output nodes', () => {
    it('StepNode with typedDef respects input/output types', async () => {
      const s0 = new StepNode<typeof basicMeta, TTyped>({
        id: nid('s0'),
        def: typedDef,
        config: { value: 1 },
      })

      const s1 = new StepNode<typeof basicMeta, TTyped>({
        id: nid('s1'),
        def: typedDef,
        config: { value: 1 },
      })

      s1.prevNodeId = nid('s0')

      const handler = makeStepHandler(basicMeta, typedHandlerOptions)
      s0.initialize(handler)
      s1.initialize(handler)

      s0.outputData = new BitMask(1, 1) as unknown as PassThrough
      s0.isDirty = false
      s0.initialized = true

      const store = makeStore({
        [nid('s0')]: s0,
        [nid('s1')]: s1,
      })

      s1.isDirty = true
      await s1.processRunner(store)

      expect(s1.outputData).toBe(s0.outputData)
    })
  })
})
