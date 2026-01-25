export abstract class StepValidationError extends Error {

  abstract slug: string

  protected constructor(
    readonly title: string,
    readonly message: string,
  ) {
    super(`${title}: ${message}`)
  }
}