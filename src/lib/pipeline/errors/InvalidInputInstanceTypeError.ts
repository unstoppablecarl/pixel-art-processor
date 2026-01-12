import type { StepDataType } from '../_types.ts'
import { StepValidationError } from './StepValidationError.ts'

export const INVALID_INPUT_INSTANCE_TYPE_ERROR = 'INVALID_INPUT_INSTANCE_TYPE_ERROR'

export class InvalidInputInstanceTypeError extends StepValidationError {
  slug = INVALID_INPUT_INSTANCE_TYPE_ERROR

  constructor(
    readonly expectedTypes: readonly StepDataType[],
    readonly receivedInstance: any,
  ) {
    const accepted = expectedTypes.map(t => t.displayName).join('/')
    super('Invalid Input Data Instance Type', `Accepted: ${accepted}, Received: ${receivedInstance}`)
    console.error('Invalid Input Data Type', receivedInstance)
  }
}