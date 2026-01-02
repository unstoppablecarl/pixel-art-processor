import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AnyBranchNode, AnyForkNode, AnyStepNode } from '../src/lib/pipeline/Node.ts'
import { BRANCH_DEF } from '../src/lib/pipeline/StepRegistry.ts'
import { type PipelineStore, usePipelineStore } from '../src/lib/store/pipeline-store.ts'

// Helpers to reduce noise
function addStepAfter(store: PipelineStore, prevId: string | null = null): AnyStepNode {
  return store.addStep('bitmask_islands_add' as any, prevId as any)
}

function addForkAfter(store: PipelineStore, prevId: string | null = null): AnyForkNode {
  return store.addFork('fork_step' as any, prevId as any)
}

function addBranchTo(store: PipelineStore, forkId: string): AnyBranchNode {
  return store.addBranch(BRANCH_DEF as any, forkId as any)
}

describe('PipelineStore remove() and move()', () => {
  let store: PipelineStore

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePipelineStore() as unknown as PipelineStore
  })

  // ────────────────────────────────────────────────────────────────
  // BRANCH REMOVAL
  // ────────────────────────────────────────────────────────────────
  it('removes a branch and reindexes remaining branches', async () => {
    const root = addStepAfter(store)
    const fork = addForkAfter(store, root.id)
    const b1 = addBranchTo(store, fork.id)
    const b2 = addBranchTo(store, fork.id)

    await Promise.resolve()

    expect(fork.branchIds).toEqual([b1.id, b2.id])

    store.remove(b1.id)
    await Promise.resolve()

    expect(fork.branchIds).toEqual([b2.id])
    expect(store.has(b1.id)).toBe(false)
    expect(store.getBranch(b2.id).branchIndex).toBe(0)
  })

  // ────────────────────────────────────────────────────────────────
  // STEP REMOVAL (collapse chain)
  // ────────────────────────────────────────────────────────────────
  it('removes a step and collapses the chain', async () => {
    const a = addStepAfter(store)
    const b = addStepAfter(store, a.id)
    const c = addStepAfter(store, b.id)

    await Promise.resolve()

    // A → B → C
    expect(store.get(a.id).childIds(store)).toEqual([b.id])
    expect(store.get(b.id).childIds(store)).toEqual([c.id])

    store.remove(b.id)
    await Promise.resolve()

    // A → C
    expect(store.get(a.id).childIds(store)).toEqual([c.id])
    expect(store.get(c.id).prevNodeId).toBe(a.id)
    expect(store.has(b.id)).toBe(false)
  })

  // ────────────────────────────────────────────────────────────────
  // FORK REMOVAL (delete subtree)
  // ────────────────────────────────────────────────────────────────
  it('removes a fork and all its branches + descendants', async () => {
    const root = addStepAfter(store)
    const fork = addForkAfter(store, root.id)
    const b1 = addBranchTo(store, fork.id)
    const b2 = addBranchTo(store, fork.id)

    const b1step = addStepAfter(store, b1.id)
    const b2step = addStepAfter(store, b2.id)

    await Promise.resolve()

    store.remove(fork.id)
    await Promise.resolve()

    expect(store.has(fork.id)).toBe(false)
    expect(store.has(b1.id)).toBe(false)
    expect(store.has(b2.id)).toBe(false)
    expect(store.has(b1step.id)).toBe(false)
    expect(store.has(b2step.id)).toBe(false)

    // root should now have no child
    expect(store.get(root.id).childIds(store)).toEqual([])
  })

  // ────────────────────────────────────────────────────────────────
  // MOVE STEP
  // ────────────────────────────────────────────────────────────────
  it('moves a step after another step', async () => {
    const a = addStepAfter(store)
    const b = addStepAfter(store, a.id)
    const c = addStepAfter(store, b.id)

    await Promise.resolve()

    // A → B → C
    expect(store.get(a.id).childIds(store)).toEqual([b.id])
    expect(store.get(b.id).childIds(store)).toEqual([c.id])

    store.moveStepNode(b.id, c.id) // move B after C
    await Promise.resolve()

    // A → C → B
    expect(store.get(a.id).childIds(store)).toEqual([c.id])
    expect(store.get(c.id).childIds(store)).toEqual([b.id])
    expect(store.get(b.id).prevNodeId).toBe(c.id)
  })

  // ────────────────────────────────────────────────────────────────
  // MOVE STEP TO ROOT
  // ────────────────────────────────────────────────────────────────
  it('moves a step to root position', async () => {
    const a = addStepAfter(store)
    const b = addStepAfter(store, a.id)

    await Promise.resolve()

    // A → B
    expect(store.get(a.id).childIds(store)).toEqual([b.id])

    store.moveStepNode(b.id, null)
    await Promise.resolve()

    // B is now root
    expect(store.rootNode()?.id).toBe(b.id)
    expect(store.get(b.id).childIds(store)).toEqual([a.id])
    expect(store.get(a.id).prevNodeId).toBe(b.id)
  })
})
