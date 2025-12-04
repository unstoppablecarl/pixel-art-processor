import { type App, type Component, inject, type InjectionKey } from 'vue'

import type { DataStructureConstructor } from '../step-data-types/BaseDataStructure.ts'
import { StepDataTypeRegistry } from '../step-data-types/StepDataTypeRegistry.ts'
import type { IStepHandler } from './StepHandler.ts'

export type StepDefinition = {
  readonly def: string,
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

  return {
    defineStep,
    defineSteps,
    get,
    has,
    validateDef,
    dataTypeRegistry,
    toArray() {
      return Object.values(STEP_DEFINITIONS)
    },
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