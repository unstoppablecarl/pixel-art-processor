import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowReactive, watch } from 'vue'
import { type NodeDef, type NodeId, NodeType } from '../pipeline/_types.ts'
import {
  type AnyBranchNode,
  type AnyForkNode,
  type AnyInitializedNode,
  type AnyNode,
  type AnyNodeSerialized,
  type AnyStepNode,
  BranchNode,
  deSerializeNode,
  ForkNode,
  isBranch,
  isFork,
  isStep,
  StepNode,
} from '../pipeline/Node.ts'
import { getNodeRegistry } from '../pipeline/NodeRegistry.ts'
import type { ImgSize } from '../pipeline/types/image-types.ts'
import { logNodeEventWarning } from '../util/logs.ts'
import { prng } from '../util/prng.ts'
import { makeNodeRunnerQueue } from './pipeline-store/node-runner-queue.ts'

type SerializedState = {
  nodes: AnyNodeSerialized[],
  idIncrement: number,
  globalSeed: number,
}

export type PipelineStore = ReturnType<typeof usePipelineStore>

export const usePipelineStore = defineStore('pipeline', () => {
    const nodeRegistry = getNodeRegistry()
    const queue = makeNodeRunnerQueue({ runNode, getAncestorNodeIds })

    const nodes = reactive<Record<string, AnyNode>>({})
    const idIncrement = ref(0)
    const globalSeed = ref(3)

    function $reset() {
      Object.keys(nodes).forEach(key => delete nodes[key])
      idIncrement.value = 0
      globalSeed.value = 3
    }

    function $serializeState(): SerializedState {
      return {
        nodes: Object.values(nodes).map(n => n.serialize() as AnyNodeSerialized),
        idIncrement: idIncrement.value,
        globalSeed: globalSeed.value,
      }
    }

    function $restoreState(data: SerializedState) {
      data.nodes.forEach(node => loadNode(node))
      idIncrement.value = data.idIncrement ?? 0
      globalSeed.value = data.globalSeed
    }

    watch(globalSeed, () => {
      prng.setSeed(globalSeed.value)
      markRootDirty()
    })

    function rootNode() {
      return Object.values(nodes).find(n => n.prevNodeId === null)
    }

    function _defToId(def: NodeDef): NodeId {
      return `${def}_${idIncrement.value++}` as NodeId
    }

    function maybeGet(id: NodeId): AnyNode | null {
      return nodes[id] ?? null
    }

    function maybeGetStep(id: NodeId): AnyStepNode | null {
      return nodes[id] ? getStep(id) : null
    }

    function maybeGetFork(id: NodeId): AnyForkNode | null {
      return nodes[id] ? getFork(id) : null
    }

    function maybeGetBranch(id: NodeId): AnyBranchNode | null {
      return nodes[id] ? getBranch(id) : null
    }

    function get(id: NodeId): AnyNode {
      if (!nodes[id]) throw new Error('node not found: ' + id)
      return nodes[id]
    }

    function getStep(id: NodeId): AnyStepNode {
      const step = get(id)
      if (!isStep(step)) throw new Error(`${id} is not a step`)
      return step as AnyStepNode
    }

    function getFork(id: NodeId): AnyForkNode {
      const fork = get(id)
      if (!isFork(fork)) throw new Error(`${id} is not a fork`)
      return fork as AnyForkNode
    }

    function getBranch(id: NodeId): AnyBranchNode {
      const branch = get(id)
      if (!isBranch(branch)) throw new Error(`${id} is not a branch`)
      return branch as AnyBranchNode
    }

    function getIfExists(id: NodeId): AnyNode | undefined {
      return nodes[id] as AnyNode | undefined
    }

    function has(id: NodeId): boolean {
      return !!nodes[id]
    }

    function hasWithDef(def: NodeDef): boolean {
      return Object.values(nodes).some(n => n.def === def)
    }

    function addRaw(def: NodeDef, afterId: NodeId | null): AnyNode {
      const type = nodeRegistry.getNodeType(def)
      if (type == NodeType.STEP) return addStepRaw(def, afterId)
      if (type == NodeType.FORK) return addForkRaw(def, afterId)
      if (type == NodeType.BRANCH) {
        if (!afterId) throw new Error('afterId required by BranchNode')
        return addBranchRaw(def, afterId)
      }

      throw new Error('Invalid def')
    }

    function add(def: NodeDef, afterId: NodeId | null): AnyNode {
      const type = nodeRegistry.getNodeType(def)
      if (type == NodeType.STEP) return addStep(def, afterId)
      if (type == NodeType.FORK) return addFork(def, afterId)
      if (type == NodeType.BRANCH) {
        if (!afterId) throw new Error('afterId required by BranchNode')
        return addBranch(def, afterId)
      }

      throw new Error('Invalid def')
    }

    function _nodeFromSerialized(serialized: AnyNodeSerialized) {
      return shallowReactive(deSerializeNode(serialized))
    }

    function loadNode(serialized: AnyNodeSerialized) {
      nodes[serialized.id] = _nodeFromSerialized(serialized)
    }

    function addStep(def: NodeDef, prevNodeId: NodeId | null, config?: {}, extra?: {
      seed?: number,
      visible?: boolean,
      muted?: boolean,
      paused?: boolean
    }): AnyStepNode {
      const step = addStepRaw(def, prevNodeId, config, extra)
      markDirty(step.id)
      return step
    }

    function addStepRaw(def: NodeDef, prevNodeId: NodeId | null, config?: {}, extra?: {
      seed?: number,
      visible?: boolean
    }): AnyStepNode {
      if (prevNodeId) {
        const prev = get(prevNodeId)
        nodeRegistry.validateCanBeChildOf(def, prev.def)
      }
      const id = _defToId(def)
      return nodes[id] = shallowReactive(new StepNode({ id, def, prevNodeId, config, ...extra }))
    }

    function addFork(def: NodeDef, prevNodeId: NodeId | null, config?: {}, extra?: {
      seed?: number,
      visible?: boolean
    }): AnyForkNode {
      const fork = addForkRaw(def, prevNodeId, config, extra)
      markDirty(fork.id)
      return fork
    }

    function addForkRaw(def: NodeDef, prevNodeId: NodeId | null, config?: {}, extra?: {
      seed?: number,
      visible?: boolean
    }): AnyForkNode {
      if (prevNodeId) {
        const prev = get(prevNodeId)
        nodeRegistry.validateCanBeChildOf(def, prev.def)
      }
      const id = _defToId(def)
      return nodes[id] = shallowReactive(new ForkNode({ id, def, prevNodeId, config, ...extra }))
    }

    function addBranch(def: NodeDef, prevNodeId: NodeId, config?: {}, extra?: {
      seed?: number,
      visible?: boolean
    }): AnyBranchNode {
      const branch = addBranchRaw(def, prevNodeId, config, extra)
      markDirty(branch.id)
      return branch
    }

    function addBranchRaw(def: NodeDef, prevNodeId: NodeId, config?: {}, extra?: {
      seed?: number,
      visible?: boolean
    }): AnyBranchNode {
      const fork = getFork(prevNodeId) as AnyForkNode
      const branchIndex = fork.branchIds.value.length

      const id = _defToId(def)
      const branch = shallowReactive(new BranchNode({ id, def, prevNodeId, branchIndex, config, ...extra }))
      nodes[id] = branch

      fork.branchIds.value.push(id)
      return branch
    }

    function getDescendantIds(id: NodeId): NodeId[] {
      const result: NodeId[] = []
      const visited = new Set<NodeId>()

      function walk(currentId: NodeId) {
        if (visited.has(currentId)) return
        visited.add(currentId)

        const node = getIfExists(currentId)
        if (!node) return

        const store = usePipelineStore()
        for (const childId of node.childIds(store)) {
          result.push(childId)
          walk(childId)
        }
      }

      walk(id)
      return result
    }

    function removeBranchOrForkAndDescendants(id: NodeId): void {
      const node = get(id)
      if (isStep(node)) throw new Error(`${id} is not a branch or fork`)
      for (const descendantId of getDescendantIds(id)) {
        delete nodes[descendantId]
      }
      delete nodes[id]
    }

    function detachStep(node: AnyStepNode) {
      const store = usePipelineStore()

      const parentId = node.prevNodeId
      const childId = node.childIds(store)[0] ?? null

      node.prevNodeId = null

      if (childId) {
        get(childId).prevNodeId = null
      }

      if (parentId && childId) {
        get(childId).prevNodeId = parentId
      }
    }

    function remove(id: NodeId): void {
      const node = get(id)

      node.handler!?.onRemoving?.(node as AnyInitializedNode)

      if (isStep(node)) {
        detachStep(node)
        delete nodes[id]
        node.handler!?.onRemoved?.(id)
        return
      }

      if (isBranch(node)) {
        const branch = node as AnyBranchNode
        const parentId = branch.prevNodeId
        if (parentId) {
          const store = usePipelineStore()
          getFork(parentId).removeBranch(store, branch.id)
        }
        removeBranchOrForkAndDescendants(id)
        node.handler!?.onRemoved?.(id)
        return
      }

      if (isFork(node)) {
        removeBranchOrForkAndDescendants(id)
        node.handler!?.onRemoved?.(id)
        return
      }

      throw new Error(`remove: unsupported node type for ${id}`)
    }

    function moveStepNode(id: NodeId, afterId: NodeId | null) {
      moveStepNodeRaw(id, afterId)
      markDirty(id)
    }

    function moveStepNodeRaw(id: NodeId, afterId: NodeId | null) {
      const node = getStep(id)
      if (isBranch(node)) throw new Error('cannot moveStepNode branch nodes')
      if (isFork(node)) throw new Error('cannot moveStepNode fork nodes')

      if (id === afterId) return

      // moveStepNode to first root position
      if (afterId === null) {
        const root = rootNode()
        if (root) {
          root.prevNodeId = node.id
        }
        node.prevNodeId = null
        return
      }

      detachStep(node)
      insertStepAfter(node, afterId)
    }

    function insertStepAfter(node: AnyStepNode, afterId: NodeId) {
      const after = get(afterId)
      if (isFork(after)) throw new Error('Cannot attach step after a ForkNode')

      const store = usePipelineStore()
      // Insert node between after and its old child
      const oldChildId = after.childIds(store)[0]
      if (oldChildId) {
        get(oldChildId).prevNodeId = node.id
      }

      node.prevNodeId = afterId
    }

    // the only place to mark a node for processing
    function markDirty(id: NodeId) {
      get(id).isDirty.value = true
      queue(id)
    }

    function markRootDirty() {
      const root = rootNode()
      if (root) markDirty(root.id)
    }

    async function runNode(id: NodeId) {
      const node = get(id)
      const store = usePipelineStore()

      // will be handled upstream
      if (!node.isReady(store)) {
        logNodeEventWarning(id, 'attempt to run failed (not ready)', node)
        return
      }

      node.isDirty.value = false
      prng.setSeed(node.getSeedSum(store))

      await node.processRunner(store)

      // After running, children become dirty
      const childIds = node.childIds(store)

      const endOfBranch = isFork(node) || isStep(node) && !childIds.length
      if (endOfBranch) {
        const parentBranch = findInAncestorNodes(node.id, (n) => isBranch(n)) as AnyBranchNode
        parentBranch?.onBranchEndResolved(node)
      }

      for (const childId of childIds) {
        markDirty(childId)
      }
    }

    function _cloneNodeInstance(original: AnyNode): AnyNode {
      const serialized = original.serialize()
      serialized.id = _defToId(serialized.def)
      return _nodeFromSerialized(serialized)
    }

    function _cloneSubtree(id: NodeId, map: Map<NodeId, NodeId>): AnyNode {
      const original = get(id)

      // 1. Clone the node (new ID, same def/config/etc)
      const clone = _cloneNodeInstance(original)
      const newId = clone.id
      nodes[newId] = clone
      map.set(id, newId)
      const store = usePipelineStore()

      for (const childId of original.childIds(store)) {
        const childClone = _cloneSubtree(childId, map)

        if (isStep(original)) {
          // Node → (Node | Fork)
          childClone.prevNodeId = newId
        } else if (isBranch(original)) {
          // Branch → (Node | Fork) via nextId
          childClone.prevNodeId = newId
        } else if (isFork(original)) {
          // Fork → Branches via branchIds[]
          const forkClone = clone as AnyForkNode
          forkClone.branchIds.value.push(childClone.id)

          const branchClone = childClone as AnyBranchNode
          branchClone.prevNodeId = newId
          branchClone.branchIndex = forkClone.branchIds.value.length - 1
        } else {
          throw new Error('cloneSubtree: unsupported node type')
        }
      }

      return clone
    }

    function duplicateStepNode(id: NodeId): NodeId {
      const step = getStep(id)
      const clone = _cloneNodeInstance(step) as AnyStepNode
      insertStepAfter(clone, step.id)
      nodes[clone.id] = clone

      markDirty(clone.id)
      return clone.id
    }

    function duplicateBranchNode(id: NodeId): NodeId {
      const original = getBranch(id)

      // 1. Deep‑clone subtree
      const cloneMap = new Map<NodeId, NodeId>()
      const cloneRoot = _cloneSubtree(id, cloneMap)
      const store = usePipelineStore()

      // Duplicate branch inside its fork's branchIds[]
      const parentFork = original.getPrev(store)

      const idx = parentFork.branchIds.value.indexOf(original.id)
      if (idx === -1) {
        throw new Error(`duplicateNode: branch ${id} not found in parentFork.branchIds`)
      }

      // Insert cloned branch ID right after the original
      parentFork.branchIds.value.splice(idx + 1, 0, cloneRoot.id)

      // Fix parent/branchIndex on the cloned branch
      const branchClone = cloneRoot as AnyBranchNode
      branchClone.prevNodeId = parentFork.id
      branchClone.branchIndex = idx + 1

      // Reindex all branches
      parentFork.branchIds.value.forEach((bid: NodeId, i: number) => {
        const b = get(bid) as AnyBranchNode
        b.branchIndex = i
      })

      markDirty(cloneRoot.id)

      return cloneRoot.id
    }

    function getRootNodeOutputSize(): ImgSize {
      const root = rootNode()?.getOutputSize()
      return {
        width: root?.width ?? 64,
        height: root?.height ?? 64,
      }
    }

    const nodesProcessing = computed((): AnyNode[] => {
      return Object.values(nodes).filter(n => {
        if (!n.computedOutputReady.value) return true
        if (n.prevNodeId) return !get(n.prevNodeId).computedOutputReady.value
        return false
      })
    })

    function getLeafNodes(): AnyNode[] {
      const store = usePipelineStore()

      return Object.values(nodes).filter(n => n.childIds(store).length === 0)
    }

    function getAncestorNodeIds(id: NodeId): NodeId[] {
      const chain: NodeId[] = []
      let cur: NodeId | null = id
      const store = usePipelineStore()

      while (cur) {
        chain.push(cur)
        cur = store.get(cur).prevNodeId
      }
      return chain
    }

    function findInAncestorNodes(id: NodeId, check: (node: AnyNode) => boolean): AnyNode | undefined {
      let currentId: NodeId | null = id
      while (currentId) {
        const current = get(currentId) as AnyNode
        if (check(current)) return current
        currentId = current.prevNodeId
      }
      return
    }

    function hasInAncestorNodes(id: NodeId, check: (node: AnyNode) => boolean): boolean {
      return !!findInAncestorNodes(id, check)
    }

    function getFallbackOutputWidth(node: AnyNode | undefined | null) {
      return node?.getOutputSize()?.width || getRootNodeOutputSize().width
    }

    function getDisplayName(node: AnyNode) {
      return nodeRegistry.get(node.def).displayName
    }

    function getBranchDescendantNodeIds(branchId: NodeId): NodeId[] {
      const store = usePipelineStore()

      const ids: NodeId[] = []
      if (!has(branchId)) return []
      let currentId = get(branchId).childId(store)
      while (currentId) {
        if (!has(currentId)) break
        ids.push(currentId)
        const current = get(currentId)
        // stop after encountering the first fork
        if (isFork(current)) break
        // there should never be a branch here
        if (isBranch(current)) break

        currentId = current.childId(store)
      }

      return ids
    }

    return {
      nodes,
      idIncrement,
      globalSeed,

      $reset,
      $serializeState,
      $restoreState,

      rootNode,
      markRootDirty,
      get,
      getIfExists,
      getStep,
      getFork,
      getBranch,
      has,
      add,
      addRaw,
      addStep,
      addFork,
      addBranch,
      addStepRaw,
      addForkRaw,
      addBranchRaw,
      remove,
      moveStepNode,
      moveStepNodeRaw,
      markDirty,
      runNode,
      loadNode,
      duplicateStepNode,
      duplicateBranchNode,
      getRootNodeOutputSize,
      getLeafNodes,
      getAncestorNodeIds,
      hasInAncestorNodes,
      findInAncestorNodes,
      getDescendantIds,
      nodeIsPassthrough: nodeRegistry.nodeIsPassthrough,
      getFallbackOutputWidth,
      getDisplayName,
      getBranchDescendantNodeIds,
      maybeGet,
      maybeGetStep,
      maybeGetFork,
      maybeGetBranch,
      hasWithDef,
      nodesProcessing,
    }
  },
  {
    persist: {
      // storage: {
      //   getItem(key) {
      //
      //   },
      //   setItem(key) {
      //
      //   },
      // },
    },
  },
)
