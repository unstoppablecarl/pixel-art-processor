import type { NodeId } from '../../pipeline/Node.ts'
import type { PipelineStore } from '../pipeline-store.ts'

// Polyfill/alias for queueMicrotask (works in all environments)
const queueMicrotaskFn: (cb: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (cb: () => void) => Promise.resolve().then(cb)

export function makeNodeRunnerQueue(store: PipelineStore) {
  const pendingDirty = new Set<NodeId>()
  let flushScheduled = false

  function scheduleFlushIfNeeded() {
    if (!flushScheduled) {
      flushScheduled = true
      queueMicrotaskFn(flushDirtyNodes)
    }
  }

  async function flushDirtyNodes() {
    flushScheduled = false

    if (pendingDirty.size === 0) return

    // Snapshot dirty nodes
    const dirtySnapshot = new Set(pendingDirty)
    pendingDirty.clear()

    // Compute highest dirty ancestors
    const roots = findHighestDirtyAncestors(dirtySnapshot)

    // Run each root (usually 1, but forks may produce multiple)
    for (const rootId of roots) {
      await store.runNode(rootId)
    }
  }

  function getAncestorNodeIds(id: NodeId): NodeId[] {
    const chain: NodeId[] = []
    let cur: NodeId | null = id

    while (cur) {
      chain.push(cur)
      cur = store.get(cur).prevNodeId
    }
    return chain
  }

  function findHighestDirtyAncestors(dirtyIds: Set<NodeId>): Set<NodeId> {
    // Step 1: For each dirty node, walk all the way up to the true root
    // and record the full ancestor chain.
    const chains: Map<NodeId, NodeId[]> = new Map()

    for (const id of dirtyIds) {
      chains.set(id, getAncestorNodeIds(id))
    }

    // Step 2: For each chain, find the highest ancestor that is dirty.
    // If none are dirty, the original node is the highest dirty ancestor.
    const highestDirty = new Set<NodeId>()

    for (const [dirtyId, chain] of chains) {
      let chosen: NodeId | null = null

      // Walk from root → downward
      for (let i = chain.length - 1; i >= 0; i--) {
        const ancestor = chain[i]
        if (dirtyIds.has(ancestor)) {
          chosen = ancestor
          break
        }
      }

      // If no ancestor was dirty (should not happen), fallback to the node itself
      highestDirty.add(chosen ?? dirtyId)
    }

    // Step 3: Remove descendants — keep only the highest dirty nodes.
    // If A is an ancestor of B, and both are in the set, remove B.
    const result = new Set(highestDirty)

    for (const a of highestDirty) {
      for (const b of highestDirty) {
        if (a === b) continue

        // If b is in a's ancestor chain, b is lower → remove b
        const chain = chains.get(b)!
        if (chain.includes(a)) {
          result.delete(b)
        }
      }
    }

    return result
  }

  return function addDirty(id: NodeId) {
    pendingDirty.add(id)
    scheduleFlushIfNeeded()
  }
}

