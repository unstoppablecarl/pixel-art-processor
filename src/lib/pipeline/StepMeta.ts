import type { Component } from 'vue'
import type { DataStructureConstructor } from '../step-data-types/BaseDataStructure.ts'
import { StepType } from './Step.ts'
import type { IStepHandler } from './StepHandler.ts'
import { type StepDefinition } from './StepRegistry.ts'

export type StepMeta = {
  type: StepType,
  def: string,
  displayName: string,
} & Pick<IStepHandler<any>, 'inputDataTypes' | 'outputDataType'>

export function loadStepComponentsMetaData(globResults: Record<string, any>, stepDataTypes: DataStructureConstructor[]): StepDefinition[] {

  const errors = Object.entries(globResults)
    .map(([path, module]) => validateModule(path, module, stepDataTypes))
    .filter(v => v)
    .map((e) => {
      const err = e as ComponentError
      return `Step Component Errors: \n${err.path} \n${err.errors.join('\n')}`
    })

  if (errors.length) {
    errors.forEach(console.error)
    throw new Error('Step Component Errors: ' + errors.join('\n'))
  }

  return Object.entries(globResults).map(([path, module]) => {
    const { def, type, displayName, inputDataTypes, outputDataType } = (module as any).STEP_META as StepMeta

    return {
      def,
      type,
      displayName,
      component: (module as any).default as Component,
      inputDataTypes,
      outputDataType,
    }
  })
}

function validateModule(path: string, module: any, stepDataTypes: DataStructureConstructor[]): ComponentError | void {
  const STEP_META = (module as any).STEP_META as StepDefinition

  if (!STEP_META) {
    return {
      path,
      errors: [
        `STEP_META not exported`,
      ],
    }
  }

  const errors = []

  if (!STEP_META.def) {
    errors.push(`STEP_META.def not set`)
  }

  if (!STEP_META.type) {
    errors.push(`STEP_META.type not set`)
  }

  if (!STEP_META.displayName) {
    errors.push(`STEP_META.displayName not set`)
  }

  if (!STEP_META.inputDataTypes) {
    errors.push(`STEP_META.inputDataTypes not set`)
  }
  validateInputDataTypes(STEP_META.def, STEP_META.inputDataTypes, stepDataTypes)

  if (!STEP_META.outputDataType) {
    errors.push(`STEP_META.outputDataType not set`)
  }
  validateOutputDataTypes(STEP_META.def, STEP_META.outputDataType, stepDataTypes)

  if (!Array.isArray(STEP_META.inputDataTypes)) {
    errors.push(`STEP_META.inputDataTypes must be an array`)
  }

  if (errors.length) {
    return {
      path,
      errors,
    }
  }
}

type ComponentError = {
  path: string,
  errors: string[]
}

function validateInputDataTypes(def: string, inputDataTypes: any[], validDataTypes: DataStructureConstructor[]) {
  const invalid = inputDataTypes.filter(t => !validDataTypes.includes(t))
  if (invalid.length) {
    const message = `Step "${def}" has invalid Input Data Type(s). Step Data Types must be registered in main.ts with installStepRegistry() `
    console.error(message, invalid)
    throw new Error(message)
  }
}

function validateOutputDataTypes(def: string, outputDataType: any, validDataTypes: DataStructureConstructor[]) {
  if (!validDataTypes.includes(outputDataType)) {
    const message = `Step "${def}" has an invalid Output Data Type. Step Data Types must be registered in main.ts with installStepRegistry() `
    console.error(message, outputDataType)
    throw new Error(message)
  }
}