import { defineStore } from 'pinia'
import { reactive, ref, type Ref, shallowReactive, watch } from 'vue'
import { STEP_REGISTRY } from '../../steps.ts'
import {
  type AnyBranchNode,
  type AnyForkNode,
  type AnyNode,
  type AnyNodeSerialized,
  BranchNode,
  deSerializeNode,
  ForkNode,
  isBranch,
  isFork,
  NodeType,
  StepNode,
} from '../pipeline/Node.ts'
import { prng } from '../util/prng.ts'

type SerializedState = {
  nodes: AnyNodeSerialized[],
  idIncrement: number,
  globalSeed: number,
  imgScale: number,
}

export interface PipelineStore {
  nodes: Record<string, AnyNode>
  idIncrement: Ref<number>,
  globalSeed: Ref<number>,
  imgScale: Ref<number>,

  $reset(): void,
  $serializeState(): void,
  $restoreState(data: SerializedState): void,

  get(id: string): AnyNode
  markDirty(id: string): void
  schedule(id: string): void
  runNode(id: string): Promise<void>
  add(def: string, afterId?: string): void
  addStep(def: string, prevNodeId?: string): void
  addFork(def: string, prevNodeId?: string): void
  addBranch(def: string, parentForkId: string): void
  remove(id: string): void
  loadNode(serialized: AnyNodeSerialized): void
}

export const usePipelineStore = defineStore('pipeline', () => {
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

      get,
      add,
      addStep,
      addFork,
      addBranch,
      remove,
      markDirty,
      schedule,
      runNode,
      loadNode,
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
      // invalidateAll()
    })

    function _defToId(def: string) {
      return `${def}_${idIncrement.value++}`
    }

    function get(id: string): AnyNode {
      if (!nodes[id]) throw new Error('node not found: ' + id)
      return nodes[id]
    }

    function add(def: string, afterId?: string) {
      const type = STEP_REGISTRY.getNodeType(def)
      if (type == NodeType.STEP) {
        addStep(def, afterId)
      }

      if (type == NodeType.FORK) {
        addFork(def, afterId)
      }

      if (type == NodeType.BRANCH) {
        if (!afterId) {
          throw new Error('afterId required by BranchNode')
        }
        addBranch(def, afterId)
      }
    }

    function loadNode(serialized: AnyNodeSerialized) {
      nodes[serialized.id] = shallowReactive(deSerializeNode(serialized))
    }

    function addStep(def: string, prevNodeId?: string) {
      const id = _defToId(def)
      nodes[id] = shallowReactive(new StepNode({ id, def, prevNodeId }))
    }

    function addFork(def: string, prevNodeId?: string) {
      const id = _defToId(def)
      nodes[id] = shallowReactive(new ForkNode({ id, def, prevNodeId }))
    }

    function addBranch(def: string, parentForkId: string) {
      const fork = get(parentForkId) as AnyForkNode
      const branchIndex = fork.branchIds.length

      const id = _defToId(def)
      const branch = shallowReactive(new BranchNode({ id, def, parentForkId, branchIndex }))
      nodes[id] = branch

      fork.branchIds.push(id)

      branch.isDirty = true
      schedule(branch.id)
    }

    function remove(id: string): void {
      const node = get(id)

      // 1. Clean up child → parent references
      if (node.prevNodeId) {
        const parent = get(node.prevNodeId)

        // If parent is a branch, clear its nextId
        if (isBranch(parent) && parent.nextId === id) {
          parent.nextId = null
        }

        // If parent is a fork, remove this branchId
        if (isFork(parent)) {
          const index = parent.branchIds.indexOf(id)
          if (index !== -1) {
            parent.branchIds.splice(index, 1)
            parent.branchIds.forEach((bid, i) => {
              const branch = get(bid) as AnyBranchNode
              branch.branchIndex = i
            })
          }
        }
      }

      for (const childId of node.childIds(store)) {
        remove(childId)
      }

      delete nodes[id]
    }

    function markDirty(id: string) {
      get(id).isDirty = true
      schedule(id)
    }

    function schedule(id: string) {
      if (get(id).isReady(store)) {
        runNode(id)
      }
    }

    async function runNode(id: string) {
      const node = get(id)
      await node.processRunner(store)
      node.childIds(store).forEach(schedule)
    }

    return store
  },
  {
    persist: {
      key: 'pipeline',
    },
  },
)
