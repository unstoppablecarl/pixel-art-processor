import { defineStore } from 'pinia'
import { reactive, ref, type Ref, shallowReactive, watch } from 'vue'
import {
  type AnyBranchNode,
  type AnyForkNode,
  type AnyNode,
  type AnyNodeSerialized,
  type AnyStepNode,
  BranchNode,
  deSerializeNode,
  ForkNode,
  type GraphNode,
  isBranch,
  isFork,
  isStep,
  type NodeDef,
  type NodeId,
  NodeType,
  StepNode,
} from '../pipeline/Node.ts'
import type { AnyStepContext } from '../pipeline/Step.ts'
import { type StepHandlerOptions } from '../pipeline/StepHandler.ts'
import { type AnyStepDefinition, useStepRegistry } from '../pipeline/StepRegistry.ts'
import { type ImgSize, logNodeEventWarning } from '../util/misc.ts'
import { prng } from '../util/prng.ts'
import { makeNodeRunnerQueue } from './pipeline-store/node-runner-queue.ts'

type SerializedState = {
  nodes: AnyNodeSerialized[],
  idIncrement: number,
  globalSeed: number,
  imgScale: number,
}

export type MinStore = Pick<PipelineStore, 'get' | 'nodes'>

export interface PipelineStore {
  nodes: Record<NodeId, AnyNode>
  idIncrement: Ref<number>,
  globalSeed: Ref<number>,
  imgScale: Ref<number>,

  $reset(): void,
  $serializeState(): void,
  $restoreState(data: SerializedState): void,

  get(id: NodeId): AnyNode
  getBranch(id: NodeId): AnyBranchNode
  getFork(id: NodeId): AnyForkNode
  getStep(id: NodeId): AnyStepNode
  getIfExists(id: NodeId): AnyNode | undefined
  has(id: NodeId): boolean
  markRootDirty(): void
  rootNode(): AnyNode | undefined
  markDirty(id: NodeId): void
  runNode(id: NodeId): Promise<void>
  add(def: NodeDef, afterId?: NodeId): AnyNode
  addStep(def: NodeDef, prevNodeId?: NodeId): AnyStepNode
  addFork(def: NodeDef, prevNodeId?: NodeId): AnyForkNode
  addBranch(def: NodeDef, parentForkId: NodeId): AnyBranchNode
  remove(id: NodeId): void
  moveStepNode(id: NodeId, afterId: NodeId | null): void
  loadNode(serialized: AnyNodeSerialized): void
  initializeNode<T extends AnyStepContext>(id: NodeId, handlerOptions: StepHandlerOptions<T>): GraphNode<T>
  getStepsAddableAfter(id: NodeId): AnyStepDefinition[]
  duplicateStepNode(id: NodeId): NodeId
  duplicateBranchNode(id: NodeId): NodeId
  getRootNodeOutputSize(): ImgSize
  getLeafNodes(): AnyNode[]
}

export const usePipelineStore = defineStore('pipeline', (): PipelineStore => {
    const stepRegistry = useStepRegistry()
    const nodes = reactive<Record<string, AnyNode>>({})
    const idIncrement = ref(0)
    const globalSeed = ref(3)
    const imgScale = ref(4)

    const store: PipelineStore = {
      nodes,
      idIncrement,
      globalSeed,
      imgScale,

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
      addStep,
      addFork,
      addBranch,
      remove,
      moveStepNode,
      markDirty,
      runNode,
      loadNode,
      initializeNode,
      getStepsAddableAfter,
      duplicateStepNode,
      duplicateBranchNode,
      getRootNodeOutputSize,
      getLeafNodes,
    }

    function $reset() {
      Object.keys(nodes).forEach(key => delete nodes[key])
      idIncrement.value = 0
      globalSeed.value = 3
      imgScale.value = 4
    }

    function $serializeState(): SerializedState {
      return {
        nodes: Object.values(nodes).map(n => n.serialize() as AnyNodeSerialized),
        idIncrement: idIncrement.value,
        globalSeed: globalSeed.value,
        imgScale: imgScale.value,
      }
    }

    function $restoreState(data: SerializedState) {
      data.nodes.forEach(node => loadNode(node))
      idIncrement.value = data.idIncrement ?? 0
      globalSeed.value = data.globalSeed
      imgScale.value = data.imgScale
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

    function get(id: NodeId): AnyNode {
      if (!nodes[id]) throw new Error('node not found: ' + id)
      return nodes[id] as AnyNode
    }

    function getStep<T extends AnyStepContext>(id: NodeId): StepNode<T> {
      const step = get(id)
      if (!isStep(step)) throw new Error(`${id} is not a step`)
      return step as StepNode<T>
    }

    function getFork<T extends AnyStepContext>(id: NodeId): ForkNode<T> {
      const fork = get(id)
      if (!isFork(fork)) throw new Error(`${id} is not a fork`)
      return fork as ForkNode<T>
    }

    function getBranch<T extends AnyStepContext>(id: NodeId): BranchNode<T> {
      const branch = get(id)
      if (!isBranch(branch)) throw new Error(`${id} is not a branch`)
      return branch as BranchNode<T>
    }

    function getIfExists(id: NodeId): AnyNode | undefined {
      return nodes[id] as AnyNode | undefined
    }

    function has(id: NodeId): boolean {
      return !!nodes[id]
    }

    function add(def: NodeDef, afterId?: NodeId): AnyNode {
      const type = stepRegistry.getNodeType(def)
      if (type == NodeType.STEP) {
        return addStep(def, afterId)
      }

      if (type == NodeType.FORK) {
        return addFork(def, afterId)
      }

      if (type == NodeType.BRANCH) {
        if (!afterId) {
          throw new Error('afterId required by BranchNode')
        }
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

    function addStep(def: NodeDef, prevNodeId?: NodeId): AnyStepNode {
      const id = _defToId(def)
      const step = nodes[id] = shallowReactive(new StepNode({ id, def, prevNodeId }))
      markDirty(step.id)

      return step
    }

    function addFork(def: NodeDef, prevNodeId?: NodeId): AnyForkNode {
      const id = _defToId(def)
      const fork = nodes[id] = shallowReactive(new ForkNode({ id, def, prevNodeId }))
      markDirty(fork.id)

      return fork
    }

    function addBranch(def: NodeDef, prevNodeId: NodeId): AnyBranchNode {
      const fork = get(prevNodeId) as AnyForkNode
      const branchIndex = fork.branchIds.value.length

      const id = _defToId(def)
      const branch = shallowReactive(new BranchNode({ id, def, prevNodeId, branchIndex }))
      nodes[id] = branch

      fork.branchIds.value.push(id)
      markDirty(branch.id)

      return branch
    }

    function removeBranch(forkId: NodeId, branchId: NodeId): void {
      const fork = getFork(forkId)
      const index = fork.branchIds.value.indexOf(branchId)
      if (index !== -1) {
        fork.branchIds.value.splice(index, 1)
        // reindex remaining branches
        fork.branchIds.value.forEach((bid, i) => {
          const b = store.get(bid) as AnyBranchNode
          b.branchIndex = i
        })
        fork.forkOutputData.value.splice(index, 1)
      }
    }

    function getDescendantIds(id: NodeId): NodeId[] {
      const result: NodeId[] = []
      const visited = new Set<NodeId>()

      function walk(currentId: NodeId) {
        if (visited.has(currentId)) return
        visited.add(currentId)

        const node = getIfExists(currentId)
        if (!node) return

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

      if (isStep(node)) {
        detachStep(node)
        delete nodes[id]
        return
      }

      if (isBranch(node)) {
        const branch = node as AnyBranchNode
        const parentId = branch.prevNodeId
        if (parentId) {
          removeBranch(parentId, branch.id)
        }
        removeBranchOrForkAndDescendants(id)
        return
      }

      if (isFork(node)) {
        removeBranchOrForkAndDescendants(id)
        return
      }

      throw new Error(`remove: unsupported node type for ${id}`)
    }

    function moveStepNode(id: NodeId, afterId: NodeId | null) {
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
        markDirty(id)
        return
      }

      detachStep(node)
      insertStepAfter(node, afterId)
      markDirty(id)
    }

    function insertStepAfter(node: AnyStepNode, afterId: NodeId) {
      const after = get(afterId)
      if (isFork(after)) throw new Error('Cannot attach step after a ForkNode')

      // Insert node between after and its old child
      const oldChildId = after.childIds(store)[0]
      if (oldChildId) {
        get(oldChildId).prevNodeId = node.id
      }

      node.prevNodeId = afterId
    }

    const queue = makeNodeRunnerQueue(store)

    // the only place to mark a node for processing
    function markDirty(id: NodeId) {
      get(id).isDirty = true
      queue(id)
    }

    function markRootDirty() {
      const root = rootNode()
      if (root) markDirty(root.id)
    }

    async function runNode(id: NodeId) {
      const node = get(id)

      // will be handled upstream
      if (!node.isReady(store)) {
        logNodeEventWarning(id, 'attempt to run failed (not ready)', node)
        return
      }

      node.isDirty = false
      prng.setSeed(node.getSeedSum(store))

      await node.processRunner(store)

      // After running, children become dirty
      for (const childId of node.childIds(store)) {
        markDirty(childId)
      }
    }

    function initializeNode<T extends AnyStepContext>(id: NodeId, handlerOptions: StepHandlerOptions<T>): GraphNode<T> {
      const node = get(id) as unknown as GraphNode<T>
      node.initialize(handlerOptions)
      return node
    }

    function getStepsAddableAfter(id: NodeId): AnyStepDefinition[] {
      const node = get(id)
      const nodes = stepRegistry.getStepsCompatibleWithOutput(node.def)

      return nodes.filter(s => {
        if (isStep(node)) return !stepRegistry.isBranch(s.def)
        if (isFork(node)) return !stepRegistry.isFork(s.def)
        if (isBranch(node)) return false
      })
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

      for (const childId of original.childIds(store)) {
        const childClone = _cloneSubtree(childId, map)

        if (isStep(original)) {
          // Step → (Step | Fork)
          childClone.prevNodeId = newId
        } else if (isBranch(original)) {
          // Branch → (Step | Fork) via nextId
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

      return clone.id
    }

    function duplicateBranchNode(id: NodeId): NodeId {
      const original = getBranch(id)

      // 1. Deep‑clone subtree
      const cloneMap = new Map<NodeId, NodeId>()
      const cloneRoot = _cloneSubtree(id, cloneMap)

      // Duplicate branch inside its fork's branchIds[]
      const parentFork = original.parentFork(store)

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
      parentFork.branchIds.value.forEach((bid, i) => {
        const b = get(bid) as AnyBranchNode
        b.branchIndex = i
      })

      markDirty(cloneRoot.id)

      return cloneRoot.id
    }

    function getRootNodeOutputSize(): ImgSize {
      const root = rootNode()
      return root ? root.getOutputSize() : { width: 0, height: 0 }
    }

    function getLeafNodes(): AnyNode[] {
      return Object.values(nodes).filter(n => n.childIds(store).length === 0)
    }

    return store
  }

  ,
  {
    persist: {
      key: 'pipeline',
    }
    ,
  }
  ,
)
