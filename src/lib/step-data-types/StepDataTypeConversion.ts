// Assuming your other imports and STEP_DATA_TYPES are defined correctly

type ClassConstructor = new (...args: any) => any;
type ConverterFunction<I extends ClassConstructor, R> = (input: InstanceType<I>) => R;

export class StepDataTypeConverter<I extends ClassConstructor, O> {

  protected converters = new Map<I, ConverterFunction<any, O>>()

  registerConversion<T extends I>(
    inputType: T,
    converter: ConverterFunction<T, O>,
  ): void {
    this.converters.set(inputType, converter)
  }

  isInputValid(inputData: any) {
    return this.converters.has(inputData)
  }

  convert(inputData: InstanceType<I>): O {
    const inputConstructor = inputData.constructor as I
    const converter = this.converters.get(inputConstructor)

    if (!converter) {
      throw new Error(`No converter found for input type: ${inputConstructor.name}`)
    }

    return converter(inputData)
  }
}
