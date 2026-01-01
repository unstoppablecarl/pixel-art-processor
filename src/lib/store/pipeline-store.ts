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
  type NodeId, NodeType,
  StepNode,
} from '../pipeline/Node.ts'
import type { AnyStepContext } from '../pipeline/Step.ts'
import { type Config, type IStepHandler, makeStepHandler, type StepHandlerOptions } from '../pipeline/StepHandler.ts'
import { type AnyStepDefinition, useStepRegistry } from '../pipeline/StepRegistry.ts'
import { type ImgSize } from '../util/misc.ts'
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
  markRootDirty(): void
  rootNode(): AnyNode | undefined
  markDirty(id: NodeId): void
  runNode(id: NodeId): Promise<void>
  add(def: NodeDef, afterId?: NodeId): AnyNode
  addStep(def: NodeDef, prevNodeId?: NodeId): AnyStepNode
  addFork(def: NodeDef, prevNodeId?: NodeId): AnyForkNode
  addBranch(def: NodeDef, parentForkId: NodeId): AnyBranchNode
  remove(id: NodeId): void
  move(id: NodeId, afterId: NodeId | null): void
  loadNode(serialized: AnyNodeSerialized): void
  initializeNode<T extends AnyStepContext>(id: NodeId, handlerOptions: StepHandlerOptions<T>): GraphNode<T>
  getStepsAddableAfter(id: NodeId): AnyStepDefinition[]
  duplicateNode(id: NodeId): NodeId
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
      add,
      addStep,
      addFork,
      addBranch,
      remove,
      move,
      markDirty,
      runNode,
      loadNode,
      initializeNode,
      getStepsAddableAfter,
      duplicateNode,
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

    function get<T extends AnyStepContext>(id: NodeId): AnyNode<T> {
      if (!nodes[id]) throw new Error('node not found: ' + id)
      return nodes[id] as AnyNode<T>
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

    function addBranch(def: NodeDef, parentForkId: NodeId): AnyBranchNode {
      const fork = get(parentForkId) as AnyForkNode
      const branchIndex = fork.branchIds.length

      const id = _defToId(def)
      const branch = shallowReactive(new BranchNode({ id, def, parentForkId, branchIndex }))
      nodes[id] = branch

      fork.branchIds.push(id)
      markDirty(branch.id)

      return branch
    }

    function detach(id: NodeId) {
      const node = get(id)

      // If node has a parent
      if (node.prevNodeId) {
        const parent = get(node.prevNodeId)

        // Parent is a branch → clear nextId
        if (isBranch(parent) && parent.nextId === id) {
          parent.nextId = null
        }

        // Parent is a fork → remove from branchIds
        if (isFork(parent)) {
          const index = parent.branchIds.indexOf(id)
          if (index !== -1) {
            parent.branchIds.splice(index, 1)
            // reindex remaining branches
            parent.branchIds.forEach((bid, i) => {
              const b = get(bid) as AnyBranchNode
              b.branchIndex = i
            })
          }
        }
      }

      node.prevNodeId = null
    }

    function remove(id: NodeId): void {
      const node = get(id)
      detach(id)

      node.childIds(store).forEach(remove)

      delete nodes[id]
    }

    function move(nodeId: NodeId, afterId: NodeId | null) {
      const node = get(nodeId)
      if (isBranch(node)) throw new Error('cannot move branch nodes')

      // move to root
      if (afterId === null) {
        detach(nodeId)
        node.prevNodeId = null

        markDirty(nodeId)
        return
      }

      if (nodeId === afterId) return

      detach(nodeId)
      attachAfter(nodeId, afterId)
      markDirty(nodeId)
    }

    function attachAfter(nodeId: NodeId, afterId: NodeId) {
      const node = get(nodeId)
      const after = get(afterId)

      if (isFork(after)) {
        throw new Error('Cannot attach after a ForkNode')
      }

      // Branch nodes cannot be attached after StepNodes
      if (isStep(after) && isBranch(node)) {
        throw new Error('Cannot attach a BranchNode after a StepNode')
      }

      // Branch → Branch is illegal
      if (isBranch(after) && isBranch(node)) {
        throw new Error('Cannot attach a BranchNode after a BranchNode')
      }

      // Step → Branch is illegal (branches must be children of forks)
      if (isStep(after) && isBranch(node)) {
        throw new Error('Cannot attach a BranchNode after a StepNode')
      }

      // ─────────────────────────────────────────────
      // 1. CASE: after is StepNode
      // Step → Step
      // Step → Fork
      // (Branch → Step is already rejected above)
      // ─────────────────────────────────────────────
      if (isStep(after)) {
        // Insert node between after and its old child
        node.prevNodeId = afterId

        const oldChildId = after.childIds(store)[0]
        if (oldChildId) {
          get(oldChildId).prevNodeId = nodeId
        }

        return
      }

      // ─────────────────────────────────────────────
      // 3. CASE: after is BranchNode
      // Branch → Step (valid)
      // Branch → Fork (valid)
      // Branch → Branch (invalid, already rejected)
      // ─────────────────────────────────────────────
      if (isBranch(after)) {
        const oldNextId = after.nextId

        // Attach node as new first child
        after.nextId = nodeId
        node.prevNodeId = afterId

        // Reattach old child under node
        if (oldNextId) {
          const oldNext = get(oldNextId)
          oldNext.prevNodeId = nodeId
        }

        return
      }

      throw new Error('Unsupported node type in attachAfter')
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

      // Clear dirty before running
      node.isDirty = false

      await node.processRunner(store)

      // After running, children become dirty
      for (const childId of node.childIds(store)) {
        markDirty(childId)
      }
    }

    function initializeNode<T extends AnyStepContext>(id: NodeId, handlerOptions: StepHandlerOptions<T>): GraphNode<T> {
      const node = get(id) as GraphNode<T>
      const handler = makeStepHandler<T>(node.def, handlerOptions)

      node.handler = handler as IStepHandler<T>
      if (node.config === undefined) {
        node.config = handler.reactiveConfig(handler.config())
      }

      if (node.loadSerialized !== null) {
        handler.loadConfig(node.config as Config, node.loadSerialized.config)
        node.loadSerialized = null
      }

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
          const branchClone = clone as AnyBranchNode
          branchClone.nextId = childClone.id
          childClone.prevNodeId = newId
        } else if (isFork(original)) {
          // Fork → Branches via branchIds[]
          const forkClone = clone as AnyForkNode
          forkClone.branchIds.push(childClone.id)

          const branchClone = childClone as AnyBranchNode
          branchClone.parentForkId = newId
          branchClone.branchIndex = forkClone.branchIds.length - 1
        }
        throw new Error('cloneSubtree: unsupported node type')
      }

      return clone
    }

    function duplicateNode(id: NodeId): NodeId {
      const original = get(id)

      // 1. Deep‑clone subtree
      const cloneMap = new Map<NodeId, NodeId>()
      const cloneRoot = _cloneSubtree(id, cloneMap)

      // 2. Reinsert the cloned root appropriately by node type
      if (isBranch(original)) {
        // Duplicate branch inside its fork's branchIds[]
        const parentFork = get(original.parentForkId) as AnyForkNode

        const idx = parentFork.branchIds.indexOf(original.id)
        if (idx === -1) {
          throw new Error(`duplicateNode: branch ${id} not found in parentFork.branchIds`)
        }

        // Insert cloned branch ID right after the original
        parentFork.branchIds.splice(idx + 1, 0, cloneRoot.id)

        // Fix parent/branchIndex on the cloned branch
        const branchClone = cloneRoot as AnyBranchNode
        branchClone.parentForkId = parentFork.id
        branchClone.branchIndex = idx + 1

        // Reindex all branches
        parentFork.branchIds.forEach((bid, i) => {
          const b = get(bid) as AnyBranchNode
          b.branchIndex = i
        })
      } else {
        // Attach cloned root right after the original node
        attachAfter(cloneRoot.id, id)
      }

      // 3. Mark all cloned nodes dirty so they recompute
      for (const clonedId of cloneMap.values()) {
        markDirty(clonedId)
      }

      return cloneRoot.id
    }

    function getRootNodeOutputSize(): ImgSize {
      const root = rootNode()
      return {
        width: root?.outputData?.width ?? 0,
        height: root?.outputData?.height ?? 0,
      }
    }

    function getLeafNodes(): AnyNode[] {
      return Object.values(nodes).filter(n => n.childIds(store).length === 0)
    }

    return store
  },
  {
    persist: {
      key: 'pipeline',
    },
  },
)
