export abstract class StepValidationError {

  abstract slug: string

  constructor(
    public title: string,
    public message: string,
  ) {}
}