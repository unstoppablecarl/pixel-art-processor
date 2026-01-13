import { describe, expect, it } from 'vitest'
import { reactive, type Reactive } from 'vue'
import { BitMask } from '../src/lib/node-data-types/BitMask'
import { NormalMap } from '../src/lib/node-data-types/NormalMap'
import { type NodeDef, type NodeId, NodeType } from '../src/lib/pipeline/_types'
import { type AnyNode, BranchNode, ForkNode, StepNode } from '../src/lib/pipeline/Node'
import { defineStepHandler, type StepHandlerOptions } from '../src/lib/pipeline/NodeHandler/StepHandler'
import { getNodeRegistry, installNodeRegistry, makeNodeRegistry } from '../src/lib/pipeline/NodeRegistry'
import { type AnyNodeDefinition, defineBranch, defineFork, defineStep } from '../src/lib/pipeline/types/definitions'
import type { PipelineStore } from '../src/lib/store/pipeline-store'

/* ------------------------------------------------------------
   Registry setup
------------------------------------------------------------ */
installNodeRegistry(makeNodeRegistry())

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */

const nid = (s: string) => s as NodeId

function makeStore(nodes: Record<string, AnyNode>): PipelineStore {
  return {
    nodes,
    get(id: NodeId) {
      return nodes[id]
    },
    nodeIsPassthrough(node: AnyNode) {
      return getNodeRegistry().nodeIsPassthrough(node)
    },
  } as any
}

type RawConfig = { value: number }
type SerializedConfig = { value: number }
type RC = Reactive<RawConfig>

/* ------------------------------------------------------------
   Handler options
------------------------------------------------------------ */

const passthroughHandlerOptions: StepHandlerOptions<
  RawConfig,
  SerializedConfig,
  RC,
  any
> = {
  config() {
    return { value: 1 }
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
  RawConfig,
  SerializedConfig,
  RC,
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

/* ------------------------------------------------------------
   TESTS
------------------------------------------------------------ */

describe('Node classes (latest architecture)', () => {

  /* ------------------------------------------------------------
     StepNode: outputReady / isReady
  ------------------------------------------------------------ */
  describe('StepNode readiness', () => {
    it('outputReady is true only when clean, not processing, initialized', () => {
      const meta = defineStep({
        type: NodeType.STEP,
        def: 'ready-test' as NodeDef,
        displayName: 'Ready',
        inputDataTypes: [BitMask],
        outputDataType: BitMask,
      })

      const handler = defineStepHandler(meta, passthroughHandlerOptions)

      const s = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof meta
      >({
        id: nid('s'),
        def: meta.def,
        config: { value: 1 },
      })

      s.initialize(handler)

      s.isDirty.value = false
      s.isProcessing.value = false
      s.initialized.value = true

      expect(s.outputReady()).toBe(true)

      s.isDirty.value = true
      expect(s.outputReady()).toBe(false)
    })

    it('isReady requires previous node outputReady when prevNodeId exists', () => {
      const meta = defineStep({
        type: NodeType.STEP,
        def: 'ready-chain' as NodeDef,
        displayName: 'Chain',
        inputDataTypes: [BitMask],
        outputDataType: BitMask,
      })

      const handler = defineStepHandler(meta, passthroughHandlerOptions)

      const s0 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof meta
      >({
        id: nid('s0'),
        def: meta.def,
        config: { value: 1 },
      })

      const s1 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof meta
      >({
        id: nid('s1'),
        def: meta.def,
        config: { value: 1 },
        prevNodeId: nid('s0'),
      })

      s0.initialize(handler)
      s1.initialize(handler)

      s0.isDirty.value = false
      s0.isProcessing.value = false
      s0.initialized.value = true

      s1.isDirty.value = true
      s1.isProcessing.value = false
      s1.initialized.value = true

      const store = makeStore({ s0, s1 })

      expect(s1.isReady(store)).toBe(true)

      s0.isDirty.value = true
      expect(s1.isReady(store)).toBe(false)
    })
  })

  /* ------------------------------------------------------------
     StepNode: serialize
  ------------------------------------------------------------ */
  describe('StepNode serialize', () => {
    it('serialize returns initial config when handler not initialized', () => {
      const meta = defineStep({
        type: NodeType.STEP,
        def: 'serialize-test' as NodeDef,
        displayName: 'Serialize',
        inputDataTypes: [BitMask],
        outputDataType: BitMask,
      })

      const s = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof meta
      >({
        id: nid('s'),
        def: meta.def,
        config: { value: 123 },
      })

      const ser = s.serialize()
      expect(ser.config).toEqual({ value: 123 })
    })
  })

  /* ------------------------------------------------------------
     StepNode: seedSum
  ------------------------------------------------------------ */
  describe('StepNode seedSum', () => {
    it('accumulates seedSum from previous nodes', () => {
      const meta = defineStep({
        type: NodeType.STEP,
        def: 'seed-test' as NodeDef,
        displayName: 'Seed',
        inputDataTypes: [BitMask],
        outputDataType: BitMask,
      })

      const handler = defineStepHandler(meta, passthroughHandlerOptions)

      const s0 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof meta
      >({
        id: nid('s0'),
        def: meta.def,
        config: { value: 1 },
        seed: 5,
      })

      const s1 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof meta
      >({
        id: nid('s1'),
        def: meta.def,
        config: { value: 1 },
        seed: 7,
        prevNodeId: nid('s0'),
      })

      s0.initialize(handler)

      const store = makeStore({ s0, s1 })

      expect(s0.getSeedSum(store)).toBe(5)
      expect(s1.getSeedSum(store)).toBe(12)
    })
  })

  /* ------------------------------------------------------------
     ForkNode serialize
  ------------------------------------------------------------ */
  describe('ForkNode serialize', () => {
    it('serializes prevNodeId and branchIds', () => {
      const meta = defineFork({
        type: NodeType.FORK,
        def: 'fork-test' as NodeDef,
        displayName: 'Fork',
        inputDataTypes: [BitMask],
        outputDataType: BitMask,
        branchDefs: ['b0' as NodeDef, 'b1' as NodeDef],
      })

      const handler = defineStepHandler(meta, passthroughHandlerOptions)

      const f = new ForkNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof meta
      >({
        id: nid('f'),
        def: meta.def,
        branchIds: [nid('b0'), nid('b1')],
        prevNodeId: nid('s0'),
      })

      f.initialize(handler)

      const ser = f.serialize()
      expect(ser.prevNodeId).toBe(nid('s0'))
      expect(ser.branchIds).toEqual([nid('b0'), nid('b1')])
    })
  })

  /* ------------------------------------------------------------
     BranchNode serialize
  ------------------------------------------------------------ */
  describe('BranchNode serialize', () => {
    it('serializes prevNodeId and branchIndex', () => {
      const meta = defineBranch({
        type: NodeType.BRANCH,
        def: 'branch-test' as NodeDef,
        displayName: 'Branch',
        inputDataTypes: [BitMask],
        outputDataType: BitMask,
      })

      const handler = defineStepHandler(meta, passthroughHandlerOptions)

      const b = new BranchNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof meta
      >({
        id: nid('b'),
        def: meta.def,
        prevNodeId: nid('f'),
        branchIndex: 2,
      })

      b.initialize(handler)

      const ser = b.serialize()
      expect(ser.prevNodeId).toBe(nid('f'))
      expect(ser.branchIndex).toBe(2)
    })
  })

  /* ------------------------------------------------------------
     Passthrough nodes
  ------------------------------------------------------------ */
  describe('Passthrough StepNode', () => {
    it('forwards input type and outputData unchanged', async () => {
      getNodeRegistry().clear()

      const s0Meta = defineStep({
        type: NodeType.STEP,
        def: 's0' as NodeDef,
        displayName: 'S0',
        inputDataTypes: [BitMask],
        outputDataType: BitMask,
      })
      getNodeRegistry().defineNode(s0Meta as unknown as AnyNodeDefinition)

      const s1Meta = defineStep({
        type: NodeType.STEP,
        def: 's1' as NodeDef,
        displayName: 'S1',
        passthrough: true,
      })
      getNodeRegistry().defineNode(s1Meta as unknown as AnyNodeDefinition)

      const handler0 = defineStepHandler(s0Meta, typedHandlerOptions)
      const handler1 = defineStepHandler(s1Meta, passthroughHandlerOptions)

      const s0 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof s0Meta
      >({
        id: nid('s0'),
        def: s0Meta.def,
        config: { value: 1 },
      })

      const s1 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof s1Meta
      >({
        id: nid('s1'),
        def: s1Meta.def,
        config: { value: 1 },
        prevNodeId: nid('s0'),
      })

      s0.initialize(handler0)
      s1.initialize(handler1)

      const bitMask = new BitMask(1, 1)
      s0.outputData = bitMask
      s0.isDirty.value = false
      s0.initialized.value = true

      const store = makeStore({ s0, s1 })

      s1.isDirty.value = true
      await s1.processRunner(store)

      expect(s1.validationErrors).toEqual([])
      expect(s1.outputData).toBe(bitMask)
    })
  })

  /* ------------------------------------------------------------
     Typed IO nodes
  ------------------------------------------------------------ */
  describe('Typed IO StepNode', () => {
    it('respects input/output types and passes data correctly', async () => {
      getNodeRegistry().clear()
      const s0Meta = defineStep({
        type: NodeType.STEP,
        def: 's0-typed' as NodeDef,
        displayName: 'S0 Typed',
        inputDataTypes: [BitMask],
        outputDataType: NormalMap,
      })

      getNodeRegistry().defineNode(s0Meta as unknown as AnyNodeDefinition)

      const s1Meta = defineStep({
        type: NodeType.STEP,
        def: 's1-typed' as NodeDef,
        displayName: 'S1 Typed',
        inputDataTypes: [NormalMap],
        outputDataType: NormalMap,
      })
      getNodeRegistry().defineNode(s1Meta as unknown as AnyNodeDefinition)

      const handler0 = defineStepHandler(s0Meta, typedHandlerOptions)
      const handler1 = defineStepHandler(s1Meta, typedHandlerOptions)

      const s0 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof s0Meta
      >({
        id: nid('s0'),
        def: s0Meta.def,
        config: { value: 1 },
      })

      const s1 = new StepNode<
        RawConfig,
        SerializedConfig,
        RC,
        typeof s1Meta
      >({
        id: nid('s1'),
        def: s1Meta.def,
        config: { value: 1 },
        prevNodeId: nid('s0'),
      })

      s0.initialize(handler0)
      s1.initialize(handler1)

      const nm = new NormalMap(1, 1)
      s0.outputData = nm
      s0.isDirty.value = false
      s0.initialized.value = true

      const store = makeStore({ s0, s1 })

      s1.isDirty.value = true
      await s1.processRunner(store)

      expect(s1.validationErrors).toEqual([])
      expect(s1.outputData).toBe(nm)
    })
  })
})
