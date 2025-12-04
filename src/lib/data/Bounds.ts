export interface BoundsLike {
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
}

export class Bounds implements BoundsLike {

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

  trim(bounds: BoundsLike): void {
    this._trim(false, bounds)
  }

  trimNewBounds(bounds: BoundsLike): Bounds {
    return this._trim(true, bounds) as Bounds
  }

  copy(): Bounds {
    return new Bounds(
      this.minX,
      this.maxX,
      this.minY,
      this.maxY,
    )
  }

  private _trim(createNew: boolean, { minX, maxX, minY, maxY }: BoundsLike): void | Bounds {
    minX = Math.max(this.minX, minX)
    maxX = Math.min(this.maxX, maxX)
    minY = Math.max(this.minY, minY)
    maxY = Math.min(this.maxY, maxY)

    // if (__DEV__) {
    //   if (isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY)) {
    //     console.error('invalid island expandable bounds', minX, maxX, minY, maxY)
    //     throw new Error('invalid island expandable bounds')
    //   }
    // }

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

    // if (__DEV__) {
    //   if (isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY)) {
    //     console.error('invalid island expandable bounds', minX, maxX, minY, maxY)
    //     throw new Error('invalid island expandable bounds')
    //   }
    // }

    if (createNew) {
      return new Bounds(minX, maxX, minY, maxY)
    }

    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }

  grow(count: number = 1): this {
    this.minX -= count
    this.minY -= count
    this.maxX += count
    this.maxY += count
    return this
  }

  growNew(count: number = 1): Bounds {
    return this.copy().grow(count)
  }

  shrink(count: number = 1): this {
    return this.grow(-1 * count)
  }

  shrinkNew(count: number = 1): Bounds {
    return this.copy().shrink(count)
  }
}