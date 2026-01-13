import { describe, expect, it } from 'vitest'
import { type Component, type Reactive, reactive } from 'vue'
import { BitMask } from '../src/lib/node-data-types/BitMask'
import { NormalMap } from '../src/lib/node-data-types/NormalMap.ts'
import { type NodeDef, type NodeId, NodeType } from '../src/lib/pipeline/_types'
import { type AnyNode, BranchNode, ForkNode, StepNode } from '../src/lib/pipeline/Node.ts'
import { defineStepHandler, type StepHandlerOptions } from '../src/lib/pipeline/NodeHandler/StepHandler.ts'
import { getNodeRegistry, installNodeRegistry, makeNodeRegistry } from '../src/lib/pipeline/NodeRegistry.ts'
import { type AnyStepMeta, defineStep } from '../src/lib/pipeline/types/definitions.ts'
import type { PipelineStore } from '../src/lib/store/pipeline-store'
import { defineTestNode } from './_helpers.ts'

// ------------------------------------------------------------
// Registry setup
// ------------------------------------------------------------
installNodeRegistry(makeNodeRegistry())

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
    nodeIsPassthrough(node: AnyNode) {
      return getNodeRegistry().nodeIsPassthrough(node)
    },
  } as unknown as PipelineStore
}

// ------------------------------------------------------------
// Step definitions
// ------------------------------------------------------------

const passthroughDef = 'passthrough-step' as NodeDef
const passThroughMeta = defineStep({
  type: NodeType.STEP,
  def: passthroughDef,
  displayName: 'testing',
  passthrough: true,
})

getNodeRegistry().defineNode({
  ...passThroughMeta,
  component: {} as Component,
})

const typedDef = 'typed-step' as NodeDef
const basicMeta = defineStep({
  type: NodeType.STEP,
  def: typedDef,
  displayName: 'testing2',
  passthrough: false,
  inputDataTypes: [BitMask],
  outputDataType: BitMask,
})

getNodeRegistry().defineNode({
  ...basicMeta,
  component: {} as Component,
})

// ------------------------------------------------------------
// Config types
// ------------------------------------------------------------

type RawConfig = { value: number }
type SerializedConfig = { value: number }
type RC = Reactive<RawConfig>

// ------------------------------------------------------------
// Handler options
// ------------------------------------------------------------

const passthroughHandlerOptions: StepHandlerOptions<
  RawConfig,
  SerializedConfig,
  RC,
  any,
  any
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

const typedHandlerOptions = {
  config() {
    return { value: 1 }
  },
  reactiveConfig(defaults: any) {
    return reactive(defaults)
  },
  run: async ({ inputData }: { inputData: any }) => ({
    output: inputData,
    preview: null,
    meta: null,
    validationErrors: [],
  }),
}

// ------------------------------------------------------------
// TESTS
// ------------------------------------------------------------

describe('Pipeline Node Behavior', () => {
  // ------------------------------------------------------------
  // isReady / outputReady
  // ------------------------------------------------------------
  describe('isReady / outputReady', () => {
    it('outputReady returns true only when clean, not processing, initialized', () => {
      const s = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
        id: nid('s'),
        def: passthroughDef,
        config: { value: 1 },
      })

      const handler = defineStepHandler(passThroughMeta, passthroughHandlerOptions)
      s.initialize(handler)

      s.isDirty.value = false
      s.isProcessing.value = false
      s.initialized.value = true

      expect(s.outputReady()).toBe(true)

      s.isDirty.value = true
      expect(s.outputReady()).toBe(false)
    })

    it('isReady requires prev outputReady when prevNodeId exists', () => {
      const s0 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
        id: nid('s0'),
        def: passthroughDef,
        config: { value: 1 },
      })
      const s1 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
        id: nid('s1'),
        def: passthroughDef,
        config: { value: 1 },
      })

      s1.prevNodeId = nid('s0')

      const handler = defineStepHandler(passThroughMeta, passthroughHandlerOptions)
      s0.initialize(handler)
      s1.initialize(handler)

      s0.isDirty.value = false
      s0.isProcessing.value = false
      s0.initialized.value = true

      s1.isDirty.value = true
      s1.isProcessing.value = false
      s1.initialized.value = true

      const store = makeStore({
        [nid('s0')]: s0,
        [nid('s1')]: s1,
      })

      expect(s1.isReady(store)).toBe(true)

      s0.isDirty.value = true
      expect(s1.isReady(store)).toBe(false)
    })
  })

  // ------------------------------------------------------------
  // serialize() using loadSerialized?.config
  // ------------------------------------------------------------
  describe('serialize loadSerialized config', () => {
    it('serialize uses initial config when handler not initialized', () => {
      const s = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
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
      const s0 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
        id: nid('s0'),
        def: passthroughDef,
        config: { value: 1 },
        seed: 5,
      })

      const s1 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
        id: nid('s1'),
        def: passthroughDef,
        config: { value: 1 },
        seed: 7,
      })

      s1.prevNodeId = nid('s0')

      const handler = defineStepHandler(passThroughMeta, passthroughHandlerOptions)
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
      const f = new ForkNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
        id: nid('f'),
        def: passthroughDef,
        branchIds: [nid('b0'), nid('b1')],
        prevNodeId: nid('s0'),
      })

      const handler = defineStepHandler(passThroughMeta, passthroughHandlerOptions)
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
      const b = new BranchNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
        id: nid('b'),
        def: passthroughDef,
        prevNodeId: nid('f'),
        branchIndex: 2,
      })

      const handler = defineStepHandler(passThroughMeta, passthroughHandlerOptions)
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

      const s0Definition = defineTestNode({
        inputDataTypes: [BitMask],
        outputDataType: BitMask,
      })

      const s0 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof s0Definition['inputDataTypes'],
        typeof s0Definition['outputDataType']
      >({
        id: nid('s0'),
        def: s0Definition.def,
        config: { value: 1 },
      })

      const s1Definition = defineTestNode({
        passthrough: true,
      })

      expect(getNodeRegistry().get(s1Definition.def).passthrough).toBe(true)

      const s1 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        any,
        any
      >({
        id: nid('s1_passthrough'),
        def: s1Definition.def,
        config: { value: 1 },
        prevNodeId: s0.id,
      })

      expect(getNodeRegistry().get(s1Definition.def).passthrough).toBe(true)

      const handler0 = defineStepHandler(s0Definition as AnyStepMeta, passthroughHandlerOptions)

      s0.initialize(handler0)

      const handler1 = defineStepHandler(s1Definition as AnyStepMeta, passthroughHandlerOptions)
      s1.initialize(handler1)

      const bitMask = new BitMask(1, 1)
      s0.outputData = bitMask
      s0.isDirty.value = false
      s0.initialized.value = true

      const store = makeStore({
        [s0.id]: s0,
        [s1.id]: s1,
      })

      s1.isDirty.value = true
      await s1.processRunner(store)
      expect(s1.validationErrors).toEqual([])
      expect(s1.outputData).toBe(bitMask)
      expect(s1.outputData).toBe(bitMask)
    })
  })

  describe('Typed input/output nodes', () => {
    it('StepNode with typedDef respects input/output types', async () => {

      const s0Definition = defineTestNode({
        inputDataTypes: [BitMask],
        outputDataType: NormalMap,
      })

      const s0 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof s0Definition['inputDataTypes'],
        typeof s0Definition['outputDataType']
      >({
        id: nid('s0'),
        def: s0Definition.def,
        config: { value: 1 },
      })

      const s1Definition = defineTestNode({
        inputDataTypes: [NormalMap],
        outputDataType: NormalMap,
      })

      const s1 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof s1Definition['inputDataTypes'],
        typeof s1Definition['outputDataType']
      >({
        id: nid('s1'),
        def: s1Definition.def,
        config: { value: 1 },
      })

      s1.prevNodeId = nid('s0')

      const handler0 = defineStepHandler(s0Definition as AnyStepMeta, typedHandlerOptions)
      s0.initialize(handler0)

      const handler1 = defineStepHandler(s1Definition as AnyStepMeta, typedHandlerOptions)
      s1.initialize(handler1)

      s0.outputData = new NormalMap(1, 1)
      s0.isDirty.value = false
      s0.initialized.value = true

      const store = makeStore({
        [nid('s0')]: s0,
        [nid('s1')]: s1,
      })

      s1.isDirty.value = true
      await s1.processRunner(store)
      expect(s1.validationErrors).toEqual([])
      expect(s1.outputData).toBe(s0.outputData)
    })
  })
})
