import { StepValidationError } from './StepValidationError.ts'

export const INVALID_FILE_TYPE_ERROR = 'INVALID_FILE_TYPE_ERROR'
export class InvalidFileTypeError extends StepValidationError {
  slug = INVALID_FILE_TYPE_ERROR

  constructor() {
    super('Invalid File format', 'Failed to load image from ArrayBuffer')
  }
}