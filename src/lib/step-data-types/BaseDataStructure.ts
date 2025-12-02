import { Bounds } from '../data/Bounds.ts'
import { type RGBA, setImageDataPixelColor } from '../util/ImageData.ts'

export type Point = {
  x: number,
  y: number
}

export type PointValue<T> = Point & {
  value: T
}

export type PointValueFilter<T> = (x: number, y: number, value: T) => boolean

export const CARDINAL_DIRECTIONS: [number, number][] = [
  [0, 1],  // right
  [1, 0],  // down
  [0, -1], // left
  [-1, 0],  // up
] as const

export const ADJACENT_DIRECTIONS: [number, number][] = [
  ...CARDINAL_DIRECTIONS,
  [-1, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
] as const

export type ArrayTypeConstructors = typeof Uint8Array<ArrayBufferLike> |
  typeof Uint16Array<ArrayBufferLike> |
  typeof Uint32Array<ArrayBufferLike> |
  typeof Uint8ClampedArray<ArrayBufferLike>

export type ArrayTypeInstance = InstanceType<ArrayTypeConstructors>;

export abstract class BaseDataStructure<T = any, D extends ArrayTypeInstance = Uint8ClampedArray<ArrayBufferLike>> {
  readonly bounds: Bounds
  cacheBust: number

  readonly data: D

  // Hook for subclasses with complex storage (like BitMask)
  // set to false if direct array access does not work
  protected readonly canUseDirectAccess: boolean = true

  constructor(
    readonly width: number,
    readonly height: number,
    data?: D,
  ) {
    this.bounds = new Bounds(0, width, 0, height)
    this.data = data ?? this.initData(width, height)
    this.data.fill(0)
    this.cacheBust = Date.now()
  }

  protected abstract initData(width: number, height: number): D;

  // Lazy-computed cached offsets for adjacent cell access
  private _adjacentOffsets?: number[]
  private _cardinalOffsets?: number[]

  protected get adjacentOffsets(): number[] {
    if (!this._adjacentOffsets) {
      this._adjacentOffsets = ADJACENT_DIRECTIONS.map(([dx, dy]) => dy * this.width + dx)
    }
    return this._adjacentOffsets
  }

  protected get cardinalOffsets(): number[] {
    if (!this._cardinalOffsets) {
      this._cardinalOffsets = CARDINAL_DIRECTIONS.map(([dx, dy]) => dy * this.width + dx)
    }
    return this._cardinalOffsets
  }

  // Direct index calculation - use instead of get/set in hot paths
  protected idx(x: number, y: number): number {
    return y * this.width + x
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  generateImageData(valueToColor: (value: T) => RGBA): ImageData {
    const result = new ImageData(this.width, this.height)
    this.each((x, y, v) => {
      setImageDataPixelColor(result, x, y, valueToColor(v))
    })
    return result
  }

  abstract get(x: number, y: number): T;

  abstract set(x: number, y: number, value: T): void;

  abstract copy(): this;

  abstract toImageData(...args: any): ImageData;

  toUrlImage(): string {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.putImageData(this.toImageData(), 0, 0)
    return canvas.toDataURL()
  }

  // Fast path for direct array access - subclasses can override for packed storage
  protected getRaw(idx: number): T {
    return this.data[idx] as T
  }

  protected setRaw(idx: number, value: T): void {
    this.data[idx] = value as any
  }

  each(cb: (x: number, y: number, v: T) => void): void {
    const width = this.width
    const height = this.height

    if (this.canUseDirectAccess) {
      for (let y = 0; y < height; y++) {
        let idx = y * width
        for (let x = 0; x < width; x++, idx++) {
          cb(x, y, this.getRaw(idx))
        }
      }
    } else {
      // Fallback for complex storage
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          cb(x, y, this.get(x, y)!)
        }
      }
    }
  }

  map<R>(cb: (x: number, y: number, value: T) => R): R[] {
    const width = this.width
    const height = this.height
    const result = new Array<R>(width * height)
    let i = 0

    if (this.canUseDirectAccess) {
      for (let y = 0; y < height; y++) {
        let idx = y * width
        for (let x = 0; x < width; x++, idx++) {
          result[i++] = cb(x, y, this.getRaw(idx))
        }
      }
    } else {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          result[i++] = cb(x, y, this.get(x, y))
        }
      }
    }
    return result
  }

  filter(cb: (x: number, y: number, value: T) => boolean): Point[] {
    const width = this.width
    const height = this.height
    const result: Point[] = []

    if (this.canUseDirectAccess) {
      for (let y = 0; y < height; y++) {
        let idx = y * width
        for (let x = 0; x < width; x++, idx++) {
          if (cb(x, y, this.getRaw(idx))) {
            result.push({ x, y })
          }
        }
      }
    } else {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (cb(x, y, this.get(x, y))) {
            result.push({ x, y })
          }
        }
      }
    }
    return result
  }

  setMultiple(points: Point[], value: T): void {
    if (this.canUseDirectAccess) {
      const width = this.width

      for (let i = 0; i < points.length; i++) {
        const p = points[i]!
        const idx = p.y * width + p.x
        this.setRaw(idx, value)
      }
    } else {
      for (let i = 0; i < points.length; i++) {
        const p = points[i]!
        this.set(p.x, p.y, value)
      }
    }
  }

  private* iterateAdjacent(x: number, y: number, withinBounds?: Bounds): Generator<PointValue<T>> {
    const baseIdx = y * this.width + x
    const width = this.width
    const height = this.height

    if (this.canUseDirectAccess) {
      if (withinBounds) {
        for (let i = 0; i < ADJACENT_DIRECTIONS.length; i++) {
          const [dx, dy] = ADJACENT_DIRECTIONS[i]!
          const tx = x + dx
          const ty = y + dy

          if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue
          if (!withinBounds.contains(tx, ty)) continue

          const idx = baseIdx + this.adjacentOffsets[i]!
          yield { x: tx, y: ty, value: this.getRaw(idx) }
        }
      } else {
        for (let i = 0; i < ADJACENT_DIRECTIONS.length; i++) {
          const [dx, dy] = ADJACENT_DIRECTIONS[i]!
          const tx = x + dx
          const ty = y + dy

          if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue

          const idx = baseIdx + this.adjacentOffsets[i]!
          yield { x: tx, y: ty, value: this.getRaw(idx) }
        }
      }
    } else {
      // Fallback for complex storage
      if (withinBounds) {
        for (let i = 0; i < ADJACENT_DIRECTIONS.length; i++) {
          const [dx, dy] = ADJACENT_DIRECTIONS[i]!
          const tx = x + dx
          const ty = y + dy

          if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue
          if (!withinBounds.contains(tx, ty)) continue

          yield { x: tx, y: ty, value: this.get(tx, ty) }
        }
      } else {
        for (let i = 0; i < ADJACENT_DIRECTIONS.length; i++) {
          const [dx, dy] = ADJACENT_DIRECTIONS[i]!
          const tx = x + dx
          const ty = y + dy

          if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue

          yield { x: tx, y: ty, value: this.get(tx, ty) }
        }
      }
    }
  }

  private* iterateRect(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    withinBounds?: Bounds,
  ): Generator<PointValue<T>> {
    const { minX: x0, maxX: x1, minY: y0, maxY: y1 } = this.bounds.trim(minX, maxX, minY, maxY)
    const width = this.width

    if (this.canUseDirectAccess) {
      if (withinBounds) {
        for (let y = y0; y < y1; y++) {
          let idx = y * width + x0
          for (let x = x0; x < x1; x++, idx++) {
            if (withinBounds.contains(x, y)) {
              yield { x, y, value: this.getRaw(idx) }
            }
          }
        }
      } else {
        for (let y = y0; y < y1; y++) {
          let idx = y * width + x0
          for (let x = x0; x < x1; x++, idx++) {
            yield { x, y, value: this.getRaw(idx) }
          }
        }
      }
    } else {
      // Fallback for complex storage
      if (withinBounds) {
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            if (withinBounds.contains(x, y)) {
              yield { x, y, value: this.get(x, y) }
            }
          }
        }
      } else {
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            yield { x, y, value: this.get(x, y) }
          }
        }
      }
    }
  }

  private* iterateCircle(
    cx: number,
    cy: number,
    radius: number,
    withinBounds?: Bounds,
  ): Generator<PointValue<T>> {
    const r2 = radius * radius
    const { minX, maxX, minY, maxY } = this.getCircleBounds(cx, cy, radius)
    const width = this.width

    if (this.canUseDirectAccess) {
      if (withinBounds) {
        for (let ty = minY; ty <= maxY; ty++) {
          const dy = ty - cy
          const dy2 = dy * dy
          let idx = ty * width + minX

          for (let tx = minX; tx <= maxX; tx++, idx++) {
            const dx = tx - cx
            if (dx * dx + dy2 <= r2 && withinBounds.contains(tx, ty)) {
              yield { x: tx, y: ty, value: this.getRaw(idx) }
            }
          }
        }
      } else {
        for (let ty = minY; ty <= maxY; ty++) {
          const dy = ty - cy
          const dy2 = dy * dy
          let idx = ty * width + minX

          for (let tx = minX; tx <= maxX; tx++, idx++) {
            const dx = tx - cx
            if (dx * dx + dy2 <= r2) {
              yield { x: tx, y: ty, value: this.getRaw(idx) }
            }
          }
        }
      }
    } else {
      // Fallback for complex storage
      if (withinBounds) {
        for (let ty = minY; ty <= maxY; ty++) {
          const dy = ty - cy
          const dy2 = dy * dy

          for (let tx = minX; tx <= maxX; tx++) {
            const dx = tx - cx
            if (dx * dx + dy2 <= r2 && withinBounds.contains(tx, ty)) {
              yield { x: tx, y: ty, value: this.get(tx, ty) }
            }
          }
        }
      } else {
        for (let ty = minY; ty <= maxY; ty++) {
          const dy = ty - cy
          const dy2 = dy * dy

          for (let tx = minX; tx <= maxX; tx++) {
            const dx = tx - cx
            if (dx * dx + dy2 <= r2) {
              yield { x: tx, y: ty, value: this.get(tx, ty) }
            }
          }
        }
      }
    }
  }

  // Unified query logic - handles both find and filter operations
  private queryPoints(
    iterator: Generator<PointValue<T>>,
    filterValue: T | PointValueFilter<T>,
    findOnly: boolean,
  ): boolean | PointValue<T>[] {
    // Determine filter function once, outside the loop
    const filter = typeof filterValue === 'function'
      ? filterValue as PointValueFilter<T>
      : (_x: number, _y: number, v: T) => v === filterValue

    if (findOnly) {
      for (const point of iterator) {
        if (filter(point.x, point.y, point.value)) {
          return true
        }
      }
      return false
    }

    const result: PointValue<T>[] = []
    for (const point of iterator) {
      if (filter(point.x, point.y, point.value)) {
        result.push(point)
      }
    }
    return result
  }

  // Adjacent operations
  hasAdjacent(x: number, y: number, filterValue: T | PointValueFilter<T>, withinBounds?: Bounds): boolean {
    return this.queryPoints(this.iterateAdjacent(x, y, withinBounds), filterValue, true) as boolean
  }

  filterAdjacent(x: number, y: number, filterValue: T | PointValueFilter<T>, withinBounds?: Bounds): PointValue<T>[] {
    return this.queryPoints(this.iterateAdjacent(x, y, withinBounds), filterValue, false) as PointValue<T>[]
  }

  getAdjacent(x: number, y: number): PointValue<T>[] {
    return Array.from(this.iterateAdjacent(x, y))
  }

  setAdjacent(x: number, y: number, value: T): void {
    const width = this.width
    const height = this.height

    if (this.canUseDirectAccess) {
      const baseIdx = y * width + x
      for (let i = 0; i < ADJACENT_DIRECTIONS.length; i++) {
        const [dx, dy] = ADJACENT_DIRECTIONS[i]!
        const tx = x + dx
        const ty = y + dy

        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          this.setRaw(baseIdx + this.adjacentOffsets[i]!, value)
        }
      }
    } else {
      for (let i = 0; i < ADJACENT_DIRECTIONS.length; i++) {
        const [dx, dy] = ADJACENT_DIRECTIONS[i]!
        const tx = x + dx
        const ty = y + dy

        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          this.set(tx, ty, value)
        }
      }
    }
  }

  // Rectangle operations
  hasInRect(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    filterValue: T | PointValueFilter<T>,
    withinBounds?: Bounds,
  ): boolean {
    return this.queryPoints(this.iterateRect(minX, maxX, minY, maxY, withinBounds), filterValue, true) as boolean
  }

  filterRect(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    filterValue: T | PointValueFilter<T>,
    withinBounds?: Bounds,
  ): PointValue<T>[] {
    return this.queryPoints(this.iterateRect(minX, maxX, minY, maxY, withinBounds), filterValue, false) as PointValue<T>[]
  }

  getRect(minX: number, maxX: number, minY: number, maxY: number): PointValue<T>[] {
    return Array.from(this.iterateRect(minX, maxX, minY, maxY))
  }

  setRect(startX: number, startY: number, width: number, height: number, value: T): void {
    const dataWidth = this.width
    const endY = startY + height
    const endX = startX + width

    if (this.canUseDirectAccess) {
      for (let y = startY; y < endY; y++) {
        let idx = y * dataWidth + startX
        for (let x = startX; x < endX; x++, idx++) {
          this.setRaw(idx, value)
        }
      }
    } else {
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          this.set(x, y, value)
        }
      }
    }
  }

  // Circle operations
  hasInCircle(
    x: number,
    y: number,
    radius: number,
    filterValue: T | PointValueFilter<T>,
    withinBounds?: Bounds,
  ): boolean {
    return this.queryPoints(this.iterateCircle(x, y, radius, withinBounds), filterValue, true) as boolean
  }

  filterCircle(
    x: number,
    y: number,
    radius: number,
    filterValue: T | PointValueFilter<T>,
    withinBounds?: Bounds,
  ): PointValue<T>[] {
    return this.queryPoints(this.iterateCircle(x, y, radius, withinBounds), filterValue, false) as PointValue<T>[]
  }

  getCircle(x: number, y: number, radius: number): PointValue<T>[] {
    return Array.from(this.iterateCircle(x, y, radius))
  }

  getCircleBounds(x: number, y: number, radius: number) {
    const minX = Math.max(0, Math.floor(x - radius))
    const maxX = Math.min(this.width - 1, Math.ceil(x + radius))
    const minY = Math.max(0, Math.floor(y - radius))
    const maxY = Math.min(this.height - 1, Math.ceil(y + radius))

    return { minX, maxX, minY, maxY }
  }

  clear(): void {
    this.data.fill(0)
  }

  /**
   * For performance, mutations can directly modify `data`.
   * Call `invalidate()` after batch operations to trigger reactivity.
   *
   * @example
   * // Batch update
   * for (let i = 0; i < pixelMap.data.length; i++) {
   *   pixelMap.data[i] = 0
   * }
   * pixelMap.invalidate() // Notify Vue
   */
  invalidate(): this {
    this.cacheBust = Date.now()
    return this
  }

  mutate(cb: () => void) {
    cb()
    this.cacheBust = Date.now()
  }
}