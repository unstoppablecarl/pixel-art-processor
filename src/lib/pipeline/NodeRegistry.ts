import { type Component } from 'vue'
import type { DataStructureConstructor } from '../node-data-types/BaseDataStructure.ts'
import { NodeDataTypeRegistry } from '../node-data-types/NodeDataTypeRegistry.ts'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { objectsAreEqual } from '../util/misc.ts'
import { type NodeDef, type NodeId, NodeType } from './_types.ts'
import type { AnyNode } from './Node.ts'
import {
  type AnyNodeDefinition,
  type AnyNodeMeta,
  isNormalMeta,
  isPassthroughMeta,
  isStartMeta,
  type NodeDefinitions,
} from './types/definitions.ts'

export type NodeRegistry = ReturnType<typeof makeNodeRegistry>

export function makeNodeRegistry(nodeDefinitions: AnyNodeDefinition[] = [], nodeDataTypes: DataStructureConstructor[] = []) {
  const NODE_DEFINITIONS: NodeDefinitions = {}
  const dataTypeRegistry: NodeDataTypeRegistry = new NodeDataTypeRegistry(nodeDataTypes)

  function defineNode(definition: AnyNodeDefinition) {
    if (NODE_DEFINITIONS[definition.def]) {
      throw new Error('cannot define node that already exists: ' + definition.def)
    }
    NODE_DEFINITIONS[definition.def] = { ...definition }
    return NODE_DEFINITIONS[definition.def]
  }

  const defineNodes = (nodeDefinitions: AnyNodeDefinition[]) => nodeDefinitions.forEach(defineNode)
  defineNodes(nodeDefinitions)

  function get(def: string): AnyNodeDefinition {
    const result = NODE_DEFINITIONS[def as NodeDef]
    if (!result) {
      throw new Error('Node Definition not found: ' + def)
    }
    return result
  }

  function has(def: string): boolean {
    return def in NODE_DEFINITIONS
  }

  function isCompatibleWithOutputType(def: NodeDef, nodeDataType: DataStructureConstructor): boolean {
    const definition = get(def)
    if (isPassthroughMeta(definition)) return true
    return isNormalMeta(definition) && definition.inputDataTypes.includes(nodeDataType)
  }

  const getFork = (def: NodeDef) => {
    const r = get(def)
    if (r.type !== NodeType.FORK) throw new Error(`def ${def} is not a fork`)
    return r
  }

  const isFork = (def: string): boolean => get(def).type === NodeType.FORK
  const isBranch = (def: string): boolean => get(def).type === NodeType.BRANCH
  const isStep = (def: string): boolean => get(def).type === NodeType.STEP

  function addableToArray() {
    return Object.values(NODE_DEFINITIONS)
  }

  // check if parent has any ancestors that would make the child an invalid child of parent
  function _hasInvalidAncestor(store: PipelineStore, childDef: NodeDef, parentId: NodeId): boolean {
    const childDefinition = get(childDef)
    return store.hasInAncestorNodes(parentId, (node) => {
      return !(get(node.def).isValidDescendantDef?.(childDefinition) ?? true)
    })
  }

  function _canBeChildOf(childDef: NodeDef, parentDef: NodeDef): boolean {
    if (isStep(parentDef)) return !isBranch(childDef)
    if (isBranch(parentDef)) return isStep(childDef)
    if (isFork(parentDef)) return (getFork(parentDef)).branchDefs.includes(childDef)
    throw new Error('Invalid definition type')
  }

  function canBeChildOf(store: PipelineStore, childDef: NodeDef, parentId: NodeId): boolean {
    const parent = store.get(parentId)

    return _canBeChildOf(childDef, parent.def) && !_hasInvalidAncestor(store, childDef, parentId)
  }

  function validateCanBeChildOf(childDef: NodeDef, parentDef: NodeDef) {
    if (isStep(parentDef) && isBranch(childDef)) throw new Error('branch cannot be child of step')
    if (isBranch(parentDef)) {
      if (isBranch(childDef)) throw new Error('branch cannot be child of branch')
      if (isFork(childDef)) throw new Error('fork cannot be child of branch')
    }
    if (isFork(parentDef)) {
      if (isStep(childDef)) throw new Error('step cannot be child of fork')
      if (isFork(childDef)) throw new Error('fork cannot be child of fork')
    }
  }

  function validateDefRegistration(meta: AnyNodeMeta) {
    const definition = { ...get(meta.def) } as AnyNodeMeta
    // @ts-expect-error
    delete definition['component']!

    if (!objectsAreEqual(meta, definition)) {
      console.error({ meta, definition })
      throw new Error(`node def: ${meta.def} registered does not match registry`)
    }
  }

  return {
    defineNode,
    defineNodes,
    get,
    has,
    getNodeType: (def: string): NodeType => get(def).type,
    defToComponent: (def: string): Component => get(def).component,
    nodeIsPassthrough: (node: AnyNode): boolean => isPassthroughMeta(get(node.def)),
    canBeChildOf,
    validateCanBeChildOf,
    addableToArray,
    isStep,
    isFork,
    isBranch,
    dataTypeRegistry,
    isCompatibleWithOutputType,
    validateDefRegistration,
    clear: () => Object.keys(NODE_DEFINITIONS).forEach((k) => delete NODE_DEFINITIONS[k as NodeDef]),
    rootNodes: () => Object.values(NODE_DEFINITIONS)
      .filter((s) => isStartMeta(s)),
  }
}

let REGISTRY: NodeRegistry | undefined

// Restore from previous HMR state
if (import.meta.hot && !import.meta.env.VITEST) {
  if (import.meta.hot.data.nodeRegistry) {
    REGISTRY = import.meta.hot.data.nodeRegistry
  }
}

export function installNodeRegistry(registry: NodeRegistry) {
  REGISTRY = registry

  // cache hmr state
  if (import.meta.hot && !import.meta.env.VITEST) {

    import.meta.hot.data.nodeRegistry = registry
  }
}

export function getNodeRegistry(): NodeRegistry {
  if (!REGISTRY) {
    throw new Error('NodeRegistry not found. Call installNodeRegistry(makeNodeRegistry(NODE_DEFINITIONS, NODE_DATA_TYPES)) in main.ts')
  }
  return REGISTRY
}