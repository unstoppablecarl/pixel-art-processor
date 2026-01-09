import { describe, expect, it, vi } from 'vitest'
import { Component } from 'vue'
import { defineStepMeta, type NodeDef, type NodeId, NodeType } from '../src/lib/pipeline/_types'
import { BranchNode, ForkNode, StepNode } from '../src/lib/pipeline/Node'
import type { NormalRunner } from '../src/lib/pipeline/NodeRunner.ts'
import type { AnyStepContext, ReactiveConfigType, StepContext } from '../src/lib/pipeline/Step'
import type { IStepHandler, StepHandlerOptions } from '../src/lib/pipeline/StepHandler'
import { makeStepHandler } from '../src/lib/pipeline/StepHandler'
import { installStepRegistry, makeStepRegistry, useStepRegistry } from '../src/lib/pipeline/StepRegistry'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { PassThrough } from '../src/lib/step-data-types/PassThrough'
import type { PipelineStore } from '../src/lib/store/pipeline-store'

// ------------------------------------------------------------
// Install fresh registry
// ------------------------------------------------------------
installStepRegistry(makeStepRegistry())

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const nid = (s: string) => s as NodeId

interface Ctx extends AnyStepContext {
  C: RawConfig,
  RC: RawConfig
  SerializedConfig: RawConfig
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

// ------------------------------------------------------------
// Register step definitions
// ------------------------------------------------------------

const passthroughDef: NodeDef = 'passthrough-step' as any
const passThroughMeta = defineStepMeta({
  type: NodeType.STEP,
  def: passthroughDef,
  displayName: 'testing',
  passthrough: true,
})

useStepRegistry().defineStep({
  ...passThroughMeta,
  component: {} as unknown as Component,
})

const typedDef: NodeDef = 'typed-step' as any
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
  component: {} as unknown as Component,
})

type RawConfig = {
  value: number
}

type SerializedConfig = {
  value: number
}

type RC = ReactiveConfigType<RawConfig>

// ------------------------------------------------------------
// Handler options (behavior only)
// ------------------------------------------------------------

type TPassthrough = StepContext<
  typeof passThroughMeta,
  RawConfig,
  SerializedConfig,
  RC
>
const passthroughHandlerOptions = {
  config: () => ({ value: 2 } as RawConfig),
  run: async ({ inputData }) => ({
    output: inputData,
    preview: null,
    meta: null,
    validationErrors: [],
  }),
} as StepHandlerOptions<typeof passThroughMeta, RawConfig, SerializedConfig, RC, NormalRunner<TPassthrough>>

const typedHandlerOptions: StepHandlerOptions<typeof basicMeta, RawConfig, SerializedConfig, RC, NormalRunner<TPassthrough>> = {
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
//   it('StepNode initializes', () => {
//     const s = new StepNode<M, Ctx>({
//       id: nid('s'),
//       def: passthroughDef,
//       config: { value: 1 },
//     })
//
//     const handler = makeStepHandler(STEP_META, passthroughHandlerOptions)
//     s.initialize(handler)
//
//     expect(s.type).toBe(NodeType.STEP)
//   })
// })

// ------------------------------------------------------------
// isReady / outputReady
// ------------------------------------------------------------

  describe('isReady / outputReady', () => {
    it('outputReady returns true only when clean, not processing, initialized', () => {
      const s = new StepNode<typeof passThroughMeta, Ctx>({
        id: nid('s'),
        def: passthroughDef,
        config: { value: 1 },
      })

      const handler = makeStepHandler<
        typeof passThroughMeta,
        RawConfig,
        SerializedConfig,
        RC,
        NormalRunner<TPassthrough>
      >(passThroughMeta, passthroughHandlerOptions)

      s.initialize(handler as IStepHandler<typeof passThroughMeta, TPassthrough>)

      s.isDirty = false
      s.isProcessing = false
      s.initialized = true

      expect(s.outputReady()).toBe(true)

      s.isDirty = true
      expect(s.outputReady()).toBe(false)
    })

    it('isReady requires prev outputReady when prevNodeId exists', () => {
      const s0 = new StepNode<M, Ctx>({
        id: nid('s0'),
        def: passthroughDef,
        config: { value: 1 },
      })
      const s1 = new StepNode<M, Ctx>({
        id: nid('s1'),
        def: passthroughDef,
        config: { value: 1 },
      })

      s1.prevNodeId = nid('s0')

      const handler = makeStepHandler(STEP_META, passthroughHandlerOptions)
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
    it('serialize uses loadSerialized.config when handler not initialized', () => {
      const s = new StepNode<M, Ctx>({
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
      const s0 = new StepNode<M, Ctx>({
        id: nid('s0'),
        def: passthroughDef,
        config: { value: 1 },
        seed: 5,
      })

      const s1 = new StepNode<M, Ctx>({
        id: nid('s1'),
        def: passthroughDef,
        config: { value: 1 },
        seed: 7,
      })

      s1.prevNodeId = nid('s0')

      const handler = makeStepHandler(STEP_META, passthroughHandlerOptions)
      s0.initialize(handler)

      const store = makeStore({
        [nid('s0')]: s0,
        [nid('s1')]: s1,
      })

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
    it.skip('StepNode getOutputSize returns width/height from outputData', () => {
      const s = new StepNode<M, Ctx>({
        id: nid('s'),
        def: passthroughDef,
        config: { value: 1 },
      })

      const handler = makeStepHandler(STEP_META, passthroughHandlerOptions)
      s.initialize(handler)

      s.outputData = { width: 50, height: 30 } as any
      expect(s.getOutputSize()).toEqual({ width: 50, height: 30 })
    })
  })

// ------------------------------------------------------------
// Fork serialize
// ------------------------------------------------------------

  describe('ForkNode serialize', () => {
    it('serializes prevNodeId and branchIds', () => {
      const f = new ForkNode<M, Ctx>({
        id: nid('f'),
        def: passthroughDef,
        branchIds: [nid('b0'), nid('b1')],
        prevNodeId: nid('s0'),
      })

      const handler = makeStepHandler(STEP_META, passthroughHandlerOptions)
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
      const b = new BranchNode<M, Ctx>({
        id: nid('b'),
        def: passthroughDef,
        prevNodeId: nid('f'),
        branchIndex: 2,
      })

      const handler = makeStepHandler(STEP_META, passthroughHandlerOptions)
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
      const s0 = new StepNode<M, Ctx>({
        id: nid('s0'),
        def: passthroughDef,
        config: { value: 1 },
      })

      const s1 = new StepNode<M, Ctx>({
        id: nid('s1'),
        def: passthroughDef,
        config: { value: 1 },
      })

      s1.prevNodeId = nid('s0')

      const handler = makeStepHandler(STEP_META, passthroughHandlerOptions)
      s0.initialize(handler)
      s1.initialize(handler)

      const bitMask = new BitMask(1, 1)
      s0.outputData = bitMask
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

// ------------------------------------------------------------
// Typed input/output nodes
// ------------------------------------------------------------

  describe('Typed input/output nodes', () => {
    it.skip('StepNode with typedDef respects input/output types', async () => {
      const s0 = new StepNode<M, Ctx>({
        id: nid('s0'),
        def: typedDef,
        config: { value: 1 },
      })

      const s1 = new StepNode<M, Ctx>({
        id: nid('s1'),
        def: typedDef,
        config: { value: 1 },
      })

      s1.prevNodeId = nid('s0')

      const handler = makeStepHandler(STEP_META, typedHandlerOptions)
      s0.initialize(handler)
      s1.initialize(handler)

      s0.outputData = new BitMask(1, 1)
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
})
