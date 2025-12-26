import type { Component } from 'vue'
import { StepType } from './Step.ts'
import type { IStepHandler } from './StepHandler.ts'
import type { StepDefinition } from './StepRegistry.ts'


export type StepMeta = {
  type: StepType,
  def: string,
  displayName: string,
} & Pick<IStepHandler<any>, 'inputDataTypes' | 'outputDataType'>

export function loadStepComponentsMetaData(globResults: Record<string, any>): StepDefinition[] {

  const errors = Object.entries(globResults)
    .map(([path, module]) => validateModule(path, module))
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

function validateModule(path: string, module: any): ComponentError | void {
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

  if (!STEP_META.outputDataType) {
    errors.push(`STEP_META.outputDataType not set`)
  }

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