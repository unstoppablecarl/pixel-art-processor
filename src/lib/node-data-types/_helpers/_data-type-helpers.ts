import type { NodeDataTypeInstance } from '../_node-data-types.ts'

export function validateSizes(a: NodeDataTypeInstance, b: NodeDataTypeInstance) {
  if (a.width !== b.width) {
    const msg = `A width: ${a.width} does not equal B width: ${b.width}`
    console.error(msg)
    throw new Error(msg)
  }

  if (a.height !== b.height) {
    const msg = `A height: ${a.height} does not equal B height: ${b.height}`
    console.error(msg)
    throw new Error(msg)
  }
}