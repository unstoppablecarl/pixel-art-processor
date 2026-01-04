import { type Component } from 'vue'
import type { DataStructureConstructor } from '../step-data-types/BaseDataStructure.ts'
import { StepDataTypeRegistry } from '../step-data-types/StepDataTypeRegistry.ts'
import { objectsAreEqual } from '../util/misc.ts'
import { type AnyStepDefinition, type NodeDef, NodeType, type StepDefinitions } from './_types.ts'

export type StepRegistry = ReturnType<typeof makeStepRegistry>

export const BRANCH_DEF = 'branch_node' as NodeDef
export const BRANCH_STEP_DEF = {
  type: NodeType.BRANCH,
  def: BRANCH_DEF,
  displayName: 'Branch',
  passthrough: true,
  component: {} as Component,
}

export function makeStepRegistry(stepDefinitions: AnyStepDefinition[] = [], stepDataTypes: DataStructureConstructor[] = []) {
  const STEP_DEFINITIONS: StepDefinitions = {}
  const dataTypeRegistry: StepDataTypeRegistry = new StepDataTypeRegistry(stepDataTypes)

  stepDefinitions = [BRANCH_STEP_DEF, ...stepDefinitions]

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

  const isFork = (def: string): boolean => get(def).type === NodeType.FORK
  const isBranch = (def: string): boolean => get(def).type === NodeType.BRANCH
  const isStep = (def: string): boolean => get(def).type === NodeType.STEP

  function addableToArray() {
    return Object.values(STEP_DEFINITIONS).filter(({ def }) => def !== BRANCH_DEF)
  }

  function canBeChildOf(childDef: NodeDef, parentDef: NodeDef) {
    if (isStep(parentDef)) return !isBranch(childDef)
    if (isBranch(parentDef)) return isStep(childDef)
    if (isFork(parentDef)) return isBranch(childDef)
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

  function validateDefRegistration(def: string, options: {
    passthrough?: boolean,
    inputDataTypes?: any,
    outputDataType?: any
  }) {

    let inputDataTypes: undefined | DataStructureConstructor[]
    let outputDataType: undefined | DataStructureConstructor

    if (!options.passthrough) {
      ({ inputDataTypes, outputDataType } = options)
    }

    const definition = get(def)

    if (!objectsAreEqual(inputDataTypes, definition.inputDataTypes)) {
      console.error({ registeredInputDataTypes: inputDataTypes, moduleInputDataTypes: definition.inputDataTypes })
      throw new Error(`step def: ${def} registered inputDataTypes do not match module inputDataTypes`)
    }

    if (!objectsAreEqual(outputDataType, definition.outputDataType)) {
      console.error({ registeredInputDataTypes: outputDataType, moduleInputDataTypes: definition.outputDataType })
      throw new Error(`step def: ${def} registered outputDataType do not match module outputDataType`)
    }
  }

  return {
    defineStep,
    defineSteps,
    get,
    has,
    getNodeType: (def: string): NodeType => get(def).type,
    defToComponent: (def: string): Component => get(def).component,
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