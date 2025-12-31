import type { StepDataTypeInstance } from '../../steps.ts'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { type AnyNode, BranchNode, isBranch, StepNode } from './Node.ts'

export async function nodeRunner(store: PipelineStore, node: AnyNode) {

  function placeholderRunner({ inputData }) {

  }

  return node.process(() => {

    if (node.prevNodeId) {
      const inputData = getInputData(store, node)



      placeholderRunner({ inputData })
    }

  })
}

function getInputData(store: PipelineStore, node: AnyNode): StepDataTypeInstance | null {

  if (isBranch(node)) {
    const fork = node.parentFork(store)
    return fork.getOutput(node.branchIndex)
  }

  if (!node.prevNodeId) {
    return null
  }

  const prev = store.get(node.prevNodeId) as StepNode | BranchNode
  return prev.getOutput()
}