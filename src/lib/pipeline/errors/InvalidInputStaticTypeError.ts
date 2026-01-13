import type { NodeDataType } from '../_types.ts'
import { StepValidationError } from './StepValidationError.ts'

export const INVALID_INPUT_STATIC_TYPE_ERROR = 'INVALID_INPUT_STATIC_TYPE_ERROR'

export class InvalidInputStaticTypeError extends StepValidationError {
  slug = INVALID_INPUT_STATIC_TYPE_ERROR

  constructor(
    readonly expectedTypes: readonly NodeDataType[],
    readonly receivedType: NodeDataType,
  ) {
    const accepted = expectedTypes.map(t => t.displayName).join('/')
    super('Invalid Input Data Static Type', `Accepted: ${accepted}, Received: ${receivedType?.displayName ?? receivedType}`)
  }
}