export type BoundsLike = Bounds | {
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
}

export class Bounds {

  constructor(
    readonly minX: number,
    readonly maxX: number,
    readonly minY: number,
    readonly maxY: number,
  ) {
  }

  get width() {
    return this.maxX - this.minX
  }

  get height() {
    return this.maxY - this.minY
  }

  contains(x: number, y: number): boolean {
    return (x < this.maxX && x >= this.minX) && (y < this.maxY && y >= this.minY)
  }

  trim(minX: number, maxX: number, minY: number, maxY: number): Bounds;
  trim(bounds: BoundsLike): Bounds;
  trim(arg1: number | BoundsLike, arg2?: number, arg3?: number, arg4?: number): Bounds {
    let minX: number, maxX: number, minY: number, maxY: number

    if (arguments.length === 1 && typeof arg1 === 'object' && arg1 !== null) {
      const bounds = arg1 as BoundsLike;
      ({ minX, maxX, minY, maxY } = bounds)
    } else {
      minX = arg1 as number
      maxX = arg2 as number
      minY = arg3 as number
      maxY = arg4 as number
    }

    if (minX < 0) {
      minX = 0
    }

    if (maxX > this.width) {
      maxX = this.width
    }

    if (minY < 0) {
      minY = 0
    }

    if (maxY > this.height) {
      maxY = this.height
    }
    minX = Math.max(0, Math.min(minX, maxX));
    maxX = Math.min(this.maxX, Math.max(minX, maxX));

    minY = Math.max(0, Math.min(minY, maxY));
    maxY = Math.min(this.maxY, Math.max(minY, maxY));


    return new Bounds(minX, maxX, minY, maxY)
  }

}