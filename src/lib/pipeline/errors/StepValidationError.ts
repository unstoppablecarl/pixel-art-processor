export abstract class StepValidationError {

  abstract slug: string

  constructor(
    readonly title: string,
    readonly message: string,
  ) {}
}