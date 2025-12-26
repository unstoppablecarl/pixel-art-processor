import { type App, type Component, inject, type InjectionKey } from 'vue'
import type { StepDataType } from '../../steps.ts'

import type { DataStructureConstructor } from '../step-data-types/BaseDataStructure.ts'
import { PassThrough } from '../step-data-types/PassThrough.ts'
import { StepDataTypeRegistry } from '../step-data-types/StepDataTypeRegistry.ts'
import { StepType } from './Step.ts'
import type { IStepHandler } from './StepHandler.ts'

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

  function isFork(def: string): boolean {
    return get(def).type === StepType.FORK
  }

  function toArray() {
    return Object.values(STEP_DEFINITIONS)
  }

  return {
    defineStep,
    defineSteps,
    get,
    has,
    isFork,
    validateDefIsFork,
    validateDef,
    dataTypeRegistry,
    getStepsCompatibleWithOutput,
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

export function stepOutputTypeCompatibleWithInputTypes(outputType: StepDataType, inputDataTypes: StepDataType[]) {

  if (outputType === PassThrough || inputDataTypes.includes(PassThrough)) {
    return true
  }

  return inputDataTypes.includes(outputType)
}