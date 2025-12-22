import { BaseDataStructure } from './BaseDataStructure.ts'

export class PassThrough extends BaseDataStructure{
  readonly __brand = 'PassThrough'
  static displayName = 'PassThrough'

  get(x: number, y: number): any {
  }

  protected initData(width: number, height: number): Uint8ClampedArray<ArrayBufferLike> {
    // @ts-expect-error
    return undefined
  }

  set(x: number, y: number, value: any): void {
  }

  toImageData(args: any): ImageData {
    // @ts-expect-error
    return undefined
  }
}