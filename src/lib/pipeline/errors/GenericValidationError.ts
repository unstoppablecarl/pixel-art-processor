import { StepValidationError } from './StepValidationError.ts'

export const GENERIC_VALIDATION_ERROR = 'GENERIC_VALIDATION_ERROR'

export class GenericValidationError extends StepValidationError {
  slug = GENERIC_VALIDATION_ERROR

  constructor(
    readonly message: string,
  ) {
    super('Error', message)
  }
}