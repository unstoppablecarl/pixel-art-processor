import { type Component } from 'vue'
import type { StepDataType } from '../../steps.ts'
import type { DataStructureConstructor } from '../step-data-types/BaseDataStructure.ts'
import { StepDataTypeRegistry } from '../step-data-types/StepDataTypeRegistry.ts'
import { objectsAreEqual } from '../util/misc.ts'
import { type AnyNode, NodeType } from './Node.ts'
import { type AnyStepContext} from './Step.ts'
import type { StepHandlerOptions } from './StepHandler.ts'
import type { StepMeta } from './StepMeta.ts'

export type AnyStepDefinition = StepDefinition<any, any>

export type StepDefinition<
  I extends readonly StepDataType[],
  O extends StepDataType,
> = {
  readonly component: Component,
} & StepMeta<I, O>

export type StepDefinitions = Record<string, AnyStepDefinition>
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

  function validateDef(def: string) {
    get(def)
  }

  function validateDefIsFork(def: string) {
    if (!isFork(def)) {
      throw new Error(`Def ${def} is not a fork`)
    }
  }

  function getStepsCompatibleWithOutput(def: string) {
    const currentStep = get(def)

    if (currentStep.passthrough) {
      return Object.values(STEP_DEFINITIONS)
    }

    return Object.values(STEP_DEFINITIONS).filter(s => {
      if (s.passthrough) {
        return true
      }
      return s.inputDataTypes.includes(currentStep.outputDataType)
    })
  }

  function isFork(def: string): boolean {
    return get(def).type === NodeType.FORK
  }

  function isBranch(def: string): boolean {
    return get(def).type === NodeType.BRANCH
  }

  function isStep(def: string): boolean {
    return get(def).type === NodeType.STEP
  }

  function toArray() {
    return Object.values(STEP_DEFINITIONS)
  }

  function validateDefRegistration(
    def: string,
    options: StepHandlerOptions<any>,
  ) {

    let inputDataTypes: undefined | StepDataType[]
    let outputDataType: undefined | StepDataType

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

  function stepIsPassthrough<T extends AnyStepContext>(step: AnyNode<T>): boolean {
    return !!get(step.def).passthrough
  }

  return {
    defineStep,
    defineSteps,
    get,
    has,
    getNodeType(def: string): NodeType {
      return get(def).type
    },
    isFork,
    isBranch,
    isStep,
    stepIsPassthrough,
    stepIsFork: <T extends AnyStepContext>(
      step: AnyNode<T>,
    ) => isFork(step.def),
    defToComponent(def: string): Component {
      return get(def).component
    },
    validateDefIsFork,
    validateDef,
    dataTypeRegistry,
    getStepsCompatibleWithOutput,
    validateDefRegistration,
    rootSteps: () => toArray().filter(s => !s.passthrough && s.inputDataTypes.length === 0),
    toArray,
  }
}

export const BRANCH_DEF = 'branch_node'
