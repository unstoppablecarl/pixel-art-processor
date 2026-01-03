import { type Component, defineAsyncComponent } from 'vue'
import type { NodeId, StepDataType } from './pipeline/_types.ts'

export const INVALID_INPUT_TYPE = 'INVALID_INPUT_TYPE'

export abstract class StepValidationError extends Error {
  get component(): Component {
    return defineAsyncComponent(() => import('../components/ValidationErrors/GenericValidationError.vue'))
  }

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

  get component(): Component {
    return defineAsyncComponent(() => import('../components/ValidationErrors/GenericValidationError.vue'))
  }

  constructor(
    message: string,
  ) {
    super('Error', message)
    this.slug += '_' + genericErrorIncrement++
  }
}

export class InvalidInputTypeError extends StepValidationError {
  slug = INVALID_INPUT_TYPE

  get component(): Component {
    return defineAsyncComponent(() => import('../components/ValidationErrors/GenericValidationError.vue'))
  }

  constructor(
    public expectedTypes: readonly StepDataType[],
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

export function handleStepValidationError(nodeId: NodeId, error: Error) {
  const errors: StepValidationError[] = []

  if (error instanceof StepValidationError) {
    errors.push(error)
  } else {
    errors.push(new GenericValidationError(error.message + ''))
  }

  if (!(error instanceof StepValidationError)) {
    throw error
  }

  return errors
}