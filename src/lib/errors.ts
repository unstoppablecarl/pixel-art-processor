import type { Component } from 'vue'
import InvalidInputType from '../components/ValidationErrors/InvalidInputType.vue'
import type { StepDataType } from '../steps.ts'
import { INVALID_INPUT_TYPE } from './pipeline/StepHandler.ts'

export abstract class StepValidationError extends Error {
  component: Component = GenericValidationError
  abstract slug: string

  constructor(
    public title: string,
    message: string,
  ) {
    super(message)
  }
}

let genericErrorIncrement = 0

export class GenericValidationError extends StepValidationError {
  slug = 'GENERIC_VALIDATION_ERROR'
  component = GenericValidationError

  constructor(
    message: string,
  ) {
    super('Error', message)
    this.slug += '_' + genericErrorIncrement++
  }
}

export class InvalidInputTypeError extends StepValidationError {
  slug = INVALID_INPUT_TYPE
  component = InvalidInputType

  constructor(
    public expectedTypes: StepDataType[],
    public receivedType: StepDataType,
  ) {
    super('Invalid Input Data Type', `Accepted: ${expectedTypes.join('/')}, Received: ${receivedType}`)
  }
}

export class InvalidFileTypeError extends StepValidationError {
  slug = 'INVALID_FILE_TYPE_ERROR'

  constructor() {
    super('Invalid File format', 'Failed to load image from ArrayBuffer')
  }
}
