export type BoundsLike = Bounds | {
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
}

export class Bounds {

  constructor(
    public minX: number = -Infinity,
    public maxX: number = Infinity,
    public minY: number = -Infinity,
    public maxY: number = Infinity,
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

  trim(minX: number, maxX: number, minY: number, maxY: number): void;
  trim(bounds: BoundsLike): void;

  trim(arg1: number | BoundsLike, arg2?: number, arg3?: number, arg4?: number): void {
    this._trim(false, arg1, arg2, arg3, arg4)
  }

  trimNewBounds(minX: number, maxX: number, minY: number, maxY: number): Bounds;
  trimNewBounds(bounds: BoundsLike): Bounds;

  trimNewBounds(arg1: number | BoundsLike, arg2?: number, arg3?: number, arg4?: number): Bounds {
    return this._trim(true, arg1, arg2, arg3, arg4) as Bounds
  }

  private _trim(createNew: boolean, arg1: number | BoundsLike, arg2?: number, arg3?: number, arg4?: number): void | Bounds {
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
    minX = Math.max(0, minX)
    maxX = Math.min(this.width, maxX)

    minY = Math.max(0, minY)
    maxY = Math.min(this.height, maxY)

    minX = Math.max(0, Math.min(minX, maxX))
    maxX = Math.min(this.maxX, Math.max(minX, maxX))

    minY = Math.max(0, Math.min(minY, maxY))
    maxY = Math.min(this.maxY, Math.max(minY, maxY))

    if (createNew) {
      return new Bounds(minX, maxX, minY, maxY)
    }

    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }

  expand(x: number, y: number): void {
    this._expand(x, y, false)
  }

  expandNew(x: number, y: number): Bounds {
    return this._expand(x, y, true) as Bounds
  }

  private _expand(x: number, y: number, createNew: boolean): void | Bounds {
    const minX = Math.min(this.minX, x)
    const minY = Math.min(this.minY, y)
    const maxX = Math.max(this.maxX, x + 1)
    const maxY = Math.max(this.maxY, y + 1)

    if (createNew) {
      return new Bounds(minX, maxX, minY, maxY)
    }

    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }
}