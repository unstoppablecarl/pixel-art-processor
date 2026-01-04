import type { StepDataType } from '../pipeline/_types.ts'
import { StepValidationError } from './StepValidationError.ts'

export const INVALID_INPUT_TYPE_ERROR = 'INVALID_INPUT_TYPE_ERROR'

export class InvalidInputTypeError extends StepValidationError {
  slug = INVALID_INPUT_TYPE_ERROR

  constructor(
    public expectedTypes: readonly StepDataType[],
    public receivedType: StepDataType,
  ) {
    super('Invalid Input Data Type', `Accepted: ${expectedTypes.join('/')}, Received: ${receivedType}`)
  }
}