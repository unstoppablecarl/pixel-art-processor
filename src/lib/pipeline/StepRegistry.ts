import { type Component } from 'vue'
import type { DataStructureConstructor } from '../step-data-types/BaseDataStructure.ts'
import { StepDataTypeRegistry } from '../step-data-types/StepDataTypeRegistry.ts'
import type { PipelineStore } from '../store/pipeline-store.ts'
import { objectsAreEqual } from '../util/misc.ts'
import {
  type AnyStepDefinition,
  type AnyStepMeta,
  type NodeDef,
  type NodeId,
  NodeType,
  type StepDefinitions,
} from './_types.ts'
import type { AnyNode } from './Node.ts'
import type { AnyStepContext } from './Step.ts'

export type StepRegistry = ReturnType<typeof makeStepRegistry>

export function makeStepRegistry(stepDefinitions: AnyStepDefinition[] = [], stepDataTypes: DataStructureConstructor[] = []) {
  const STEP_DEFINITIONS: StepDefinitions = {}
  const dataTypeRegistry: StepDataTypeRegistry = new StepDataTypeRegistry(stepDataTypes)

  function defineStep(definition: AnyStepDefinition) {
    if (STEP_DEFINITIONS[definition.def]) {
      throw new Error('cannot define step that already exists: ' + definition.def)
    }
    STEP_DEFINITIONS[definition.def] = { ...definition }
    return STEP_DEFINITIONS[definition.def]
  }

  const defineSteps = (stepDefinitions: AnyStepDefinition[]) => stepDefinitions.forEach(defineStep)
  defineSteps(stepDefinitions)

  function get(def: string): AnyStepDefinition {
    const result = STEP_DEFINITIONS[def]
    if (!result) {
      throw new Error('Step Definition not found: ' + def)
    }
    return result
  }

  function has(def: string): boolean {
    return def in STEP_DEFINITIONS
  }

  function isCompatibleWithOutputType(def: NodeDef, stepDataType: DataStructureConstructor): boolean {
    const definition = get(def)
    if (definition.passthrough) return true
    return definition.inputDataTypes.includes(stepDataType)
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
    return Object.values(STEP_DEFINITIONS)
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

  function validateDefRegistration(meta: AnyStepMeta) {
    const definition = get(meta.def)
    if (!objectsAreEqual(meta, definition)) {
      console.error({ meta, definition })
      throw new Error(`step def: ${meta.def} registered does not match registry`)
    }
  }

  return {
    defineStep,
    defineSteps,
    get,
    has,
    getNodeType: (def: string): NodeType => get(def).type,
    defToComponent: (def: string): Component => get(def).component,
    nodeIsPassthrough: <M extends AnyStepMeta, T extends AnyStepContext>(node: AnyNode<M, T>): boolean => !!get(node.def).passthrough,
    canBeChildOf,
    validateCanBeChildOf,
    addableToArray,
    isStep,
    isFork,
    isBranch,
    dataTypeRegistry,
    isCompatibleWithOutputType,
    validateDefRegistration,
    rootNodes: () => Object.values(STEP_DEFINITIONS)
      .filter(s => !s.passthrough && s.inputDataTypes.length === 0),
  }
}

let REGISTRY: StepRegistry | undefined

// Restore from previous HMR state
if (import.meta.hot && !import.meta.env.VITEST) {
  if (import.meta.hot.data.stepRegistry) {
    REGISTRY = import.meta.hot.data.stepRegistry
  }
}

export function installStepRegistry(registry: StepRegistry) {
  REGISTRY = registry

  // cache hmr state
  if (import.meta.hot && !import.meta.env.VITEST) {

    import.meta.hot.data.stepRegistry = registry
  }
}

export function useStepRegistry(): StepRegistry {
  if (!REGISTRY) {
    throw new Error('StepRegistry not found. Call installStepRegistry(makeStepRegistry(STEP_DEFINITIONS, STEP_DATA_TYPES)) in main.ts')
  }
  return REGISTRY
}