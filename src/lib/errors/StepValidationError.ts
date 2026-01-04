export abstract class StepValidationError extends Error {

  abstract slug: string

  constructor(
    public title: string,
    message: string,
  ) {
    super(message)
  }
}