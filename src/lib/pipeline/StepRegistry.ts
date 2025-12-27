import { type App, type Component, inject, type InjectionKey } from 'vue'
import type { StepDataType } from '../../steps.ts'

import type { DataStructureConstructor } from '../step-data-types/BaseDataStructure.ts'
import { PassThrough } from '../step-data-types/PassThrough.ts'
import { StepDataTypeRegistry } from '../step-data-types/StepDataTypeRegistry.ts'
import { objectsAreEqual } from '../util/misc.ts'
import { StepType } from './Step.ts'
import type { IStepHandler } from './StepHandler.ts'
import type { StepMeta } from './StepMeta.ts'

export type StepDefinition = {
  readonly def: string,
  readonly type: StepType,
  readonly displayName: string,
  readonly component: Component,
} & Pick<IStepHandler<any>, 'inputDataTypes' | 'outputDataType'>

export type StepDefinitions = Record<string, StepDefinition>
export type StepRegistry = ReturnType<typeof makeStepRegistry>

export function makeStepRegistry(stepDefinitions: StepDefinition[] = [], stepDataTypes: DataStructureConstructor[] = []) {
  const STEP_DEFINITIONS: StepDefinitions = {}
  const dataTypeRegistry: StepDataTypeRegistry = new StepDataTypeRegistry(stepDataTypes)

  function defineStep(definition: StepDefinition) {
    if (STEP_DEFINITIONS[definition.def]) {
      throw new Error('cannot define step that already exists: ' + definition.def)
    }
    STEP_DEFINITIONS[definition.def] = { ...definition }
    return STEP_DEFINITIONS[definition.def]
  }

  const defineSteps = (stepDefinitions: StepDefinition[]) => stepDefinitions.forEach(defineStep)
  defineSteps(stepDefinitions)

  function get(def: string): StepDefinition {
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

    return Object.values(STEP_DEFINITIONS).filter(s => stepOutputTypeCompatibleWithInputTypes(currentStep.outputDataType, s.inputDataTypes))
  }

  function getStepType(def: string) {
    return get(def).type
  }

  function isFork(def: string): boolean {
    return get(def).type === StepType.FORK
  }

  function toArray() {
    return Object.values(STEP_DEFINITIONS)
  }

  function validateDefRegistration(
    def: string,
    {
      inputDataTypes,
      outputDataType,
    }: Pick<StepMeta, 'inputDataTypes' | 'outputDataType'>) {

    const definition = get(def)

    console.log({ definition }, 'zxc')

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
    getStepType,
    isFork,
    validateDefIsFork,
    validateDef,
    dataTypeRegistry,
    getStepsCompatibleWithOutput,
    validateDefRegistration,
    rootSteps: () => toArray().filter(s => s.inputDataTypes.length === 0),
    toArray,
  }
}

export const STEP_REGISTRY_INJECT_KEY: InjectionKey<StepRegistry> = Symbol('stepRegistry')

export function installStepRegistry(app: App, registry: StepRegistry) {
  app.provide(STEP_REGISTRY_INJECT_KEY, registry)
}

export function useStepRegistry(): StepRegistry {
  const registry = inject(STEP_REGISTRY_INJECT_KEY)
  if (!registry) {
    throw new Error('StepRegistry not provided. Call installStepRegistry() in main.ts')
  }
  return registry
}

export function stepOutputTypeCompatibleWithInputTypes(outputType: StepDataType, inputDataTypes: readonly StepDataType[]) {

  if (outputType === PassThrough || inputDataTypes.includes(PassThrough)) {
    return true
  }

  return inputDataTypes.includes(outputType)
}
