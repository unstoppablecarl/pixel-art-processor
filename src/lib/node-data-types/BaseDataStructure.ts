import type { Direction } from '../pipeline/_types.ts'
import { packColor, type RGBA } from '../util/data/color.ts'
import { Bounds, type BoundsLike } from '../util/data/Bounds.ts'
import { readonlyTypedArray } from '../util/misc.ts'

export type Point = {
  x: number,
  y: number
}

export type PointValue<T> = Point & {
  value: T
}

export type PointValueFilter<T> = (x: number, y: number, value: T, idx: number) => boolean
export type PointValueInspector<T> = (x: number, y: number, value: T, idx: number) => void
export type PointValueMapper<T, U> = (x: number, y: number, value: T, idx: number) => U

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

export abstract class BaseDataStructure<
  E = any,
  T extends number = number,
  D extends ArrayTypeInstance = Uint8ClampedArray<ArrayBufferLike>,
  SerializedT = T
> {
  readonly bounds: Readonly<Bounds>
  cacheBust: number

  protected _data: D
  protected _data32?: Uint32Array

  get data() {
    return this._data
  }

  get data32(): Uint32Array | undefined {
    return this._data32
  }

  constructor(
    readonly width: number,
    readonly height: number,
    sourceData?: D,
  ) {
    if (width <= 0 || height <= 0) throw new Error(`Invalid dimensions: ${width}, ${height}`)
    this.bounds = new Bounds(0, width, 0, height)
    this._data = this.initData(width, height)

    // Create 32-bit view if the buffer is compatible (multiple of 4)
    if (this._data.buffer.byteLength % 4 === 0) {
      this._data32 = new Uint32Array(this._data.buffer)
    }

    if (sourceData) this._data.set(sourceData)
    else this._data.fill(0)
    this.cacheBust = Date.now()
  }

  protected abstract initData(width: number, height: number): D;

  // Direct index calculation - use instead of get/set in hot paths
  protected idx(x: number, y: number): number {
    return y * this.width + x
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  isWithinBorder(
    x: number,
    y: number,
    borderThickness: number = 1,
  ): boolean {
    return (x < borderThickness) ||
      (x >= this.width - borderThickness) ||
      (y < borderThickness) ||
      (y >= this.height - borderThickness)
  }

  borderToBounds(
    borderThickness: number = 1,
  ): Bounds {
    return new Bounds(borderThickness, this.width - borderThickness, borderThickness, this.height - borderThickness)
  }

  generateImageData(valueToColor: (value: T) => RGBA): ImageData {
    const result = new ImageData(this.width, this.height)
    const data32 = new Uint32Array(result.data.buffer)

    let i = 0
    this.each((_x, _y, v) => {
      const { r, g, b, a } = valueToColor(v)
      data32[i++] = packColor(r, g, b, a)
    })
    return result
  }

  abstract get(x: number, y: number): E;

  abstract set(x: number, y: number, value: E): void;

  copy(): this {
    const constructor = this.constructor as new (width: number, height: number, data?: D) => this
    const copyInstance = new constructor(
      this.width,
      this.height,
    )

    copyInstance._data.set(this._data)
    copyInstance.cacheBust = this.cacheBust
    return copyInstance
  }

  lock() {
    this._data = readonlyTypedArray(this._data)
    return this
  }

  abstract toImageData(): ImageData;

  toUrlImage(): string {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.putImageData(this.toImageData(), 0, 0)
    return canvas.toDataURL()
  }

  toUrlImageAsync(): Promise<string> {
    const offscreen = new OffscreenCanvas(this.width, this.height)
    const ctx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D
    ctx.putImageData(this.toImageData(), 0, 0)
    return offscreen.convertToBlob().then(blob => URL.createObjectURL(blob))
  }

  // Fast path for direct array access - subclasses can override for packed storage
  protected getRaw(idx: number): T {
    return this._data[idx] as T
  }

  protected setRaw(idx: number, value: T): void {
    this._data[idx] = value
  }

  each(cb: PointValueInspector<T>): void {
    const w = this.width
    const h = this.height

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x
        cb(x, y, this.getRaw(idx), idx)
      }
    }
  }

  filter(cb: PointValueFilter<T>): Point[] {
    const result: PointValue<T>[] = []
    this.each((x, y, v, idx) => {
      if (cb(x, y, v, idx)) {
        result.push({ x, y, value: v })
      }
    })
    return result
  }

  map<M>(cb: PointValueMapper<T, M>): M[] {
    const result = new Array<M>(this.width * this.height)
    this.each((x, y, v, idx) => {
      result[idx] = cb(x, y, v, idx)
    })
    return result
  }

  find(condition: PointValueFilter<T>): PointValue<T> | undefined {
    const w = this.width
    const h = this.height
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x
        const v = this.getRaw(idx)
        if (condition(x, y, v, idx)) {
          return { x, y, value: v }
        }
      }
    }
  }

  has(condition: PointValueFilter<T>): boolean {
    const w = this.width
    const h = this.height
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x
        const v = this.getRaw(idx)
        if (condition(x, y, v, idx)) {
          return true
        }
      }
    }
    return false
  }

  queryPoints(points: Point[], cb: (x: number, y: number, v: T, idx: number) => void): void {
    const w = this.width
    const h = this.height

    for (let i = 0; i < points.length; i++) {
      const p = points[i]!
      // Safety check for external point lists
      if (p.x >= 0 && p.x < w && p.y >= 0 && p.y < h) {
        const idx = p.y * w + p.x
        cb(p.x, p.y, this.getRaw(idx), idx)
      }
    }
  }

  queryIndices(indices: number[] | Set<number>, cb: (x: number, y: number, v: T, idx: number) => void): void {
    const w = this.width
    // We use a standard for-of for Set compatibility, or a raw loop for arrays
    for (const idx of indices) {
      const x = idx % w
      const y = (idx / w) | 0
      cb(x, y, this.getRaw(idx), idx)
    }
  }

  // Adjacent operations
  hasAdjacent(x: number, y: number, condition: PointValueFilter<T> | T): boolean {
    const w = this.width, h = this.height
    const dirs = ADJACENT_DIRECTIONS
    const isCallback = typeof condition === 'function'

    for (let i = 0; i < dirs.length; i++) {
      const ax = x + dirs[i][0], ay = y + dirs[i][1]

      if (ax >= 0 && ax < w && ay >= 0 && ay < h) {
        const idx = ay * w + ax
        const val = this.getRaw(idx)

        if (isCallback) {
          if ((condition as PointValueFilter<T>)(ax, ay, val, idx)) return true
        } else {
          if (val === condition) return true
        }
      }
    }
    return false
  }

  filterAdjacent(x: number, y: number, condition: PointValueFilter<T>): PointValue<T>[] {
    const results: PointValue<T>[] = []
    this.eachAdjacent(x, y, (ax, ay, v, idx) => {
      if (condition(ax, ay, v, idx)) results.push({ x: ax, y: ay, value: v })
    })
    return results
  }

  eachAdjacent(x: number, y: number, cb: PointValueInspector<T>): void {
    const w = this.width, h = this.height
    const dirs = ADJACENT_DIRECTIONS
    for (let i = 0; i < dirs.length; i++) {
      const ax = x + dirs[i]![0], ay = y + dirs[i]![1]
      if (ax >= 0 && ax < w && ay >= 0 && ay < h) {
        const idx = ay * w + ax
        cb(ax, ay, this.getRaw(idx), idx)
      }
    }
  }

  getAdjacent(x: number, y: number, cb: (v: T, ax: number, ay: number, aidx: number) => void): void {
    this.eachAdjacent(x, y, (ax, ay, v, aidx) => cb(v, ax, ay, aidx))
  }

  setAdjacent(x: number, y: number, value: T): void {
    const w = this.width
    const h = this.height
    for (let i = 0; i < ADJACENT_DIRECTIONS.length; i++) {
      const dir = ADJACENT_DIRECTIONS[i]!
      const ax = x + dir[0], ay = y + dir[1]

      if (ax >= 0 && ax < w && ay >= 0 && ay < h) {
        this.setRaw(ay * w + ax, value)
      }
    }
    this.invalidate()
  }

  hasInRect(rect: BoundsLike, condition: PointValueFilter<T>): boolean {
    const { minX, maxX, minY, maxY } = this.bounds.trimNewBounds(rect)
    const w = this.width
    for (let y = minY; y < maxY; y++) {
      const row = y * w
      for (let x = minX; x < maxX; x++) {
        const idx = row + x
        if (condition(x, y, this.getRaw(idx), idx)) return true
      }
    }
    return false
  }

  findInRect(rect: BoundsLike, cb: PointValueFilter<T>): PointValue<T> | undefined {
    const { minX, maxX, minY, maxY } = this.bounds.trimNewBounds(rect)
    const w = this.width
    for (let y = minY; y < maxY; y++) {
      const rowOffset = y * w
      for (let x = minX; x < maxX; x++) {
        const idx = rowOffset + x
        const v = this.getRaw(idx)
        if (cb(x, y, v, idx)) return { x, y, value: v }
      }
    }
    return undefined
  }

  setRect(rect: BoundsLike, value: T): void {
    const { minX, maxX, minY, maxY } = this.bounds.trimNewBounds(rect)
    const w = this.width

    // Optimization: Use .fill() if we have a 32-bit view and value is a number
    if (this._data32 && typeof value === 'number') {
      for (let y = minY; y < maxY; y++) {
        const row = y * w
        this._data32.fill(value as number, row + minX, row + maxX)
      }
    } else {
      for (let y = minY; y < maxY; y++) {
        const row = y * w
        for (let x = minX; x < maxX; x++) {
          this.setRaw(row + x, value)
        }
      }
    }
    this.invalidate()
  }

  filterRect(rect: BoundsLike, condition: (v: T) => boolean): PointValue<T>[] {
    const results: PointValue<T>[] = []
    this.eachRect(rect, (x, y, v) => {
      if (condition(v)) results.push({ x, y, value: v })
    })
    return results
  }

  eachRect(rect: BoundsLike, cb: PointValueInspector<T>): void {
    const { minX, maxX, minY, maxY } = this.bounds.trimNewBounds(rect)
    const w = this.width
    for (let y = minY; y < maxY; y++) {
      const rowOffset = y * w
      for (let x = minX; x < maxX; x++) {
        const idx = rowOffset + x
        cb(x, y, this.getRaw(idx), idx)
      }
    }
  }

  setRectStroke(rect: BoundsLike, value: T): void {
    const { minX, maxX, minY, maxY } = this.bounds.trimNewBounds(rect)
    const w = this.width

    // Horizontal lines (Top & Bottom)
    for (let x = minX; x < maxX; x++) {
      this.setRaw(minY * w + x, value)
      this.setRaw((maxY - 1) * w + x, value)
    }
    // Vertical lines (Left & Right - skipping corners already handled)
    for (let y = minY + 1; y < maxY - 1; y++) {
      const row = y * w
      this.setRaw(row + minX, value)
      this.setRaw(row + (maxX - 1), value)
    }
    this.invalidate()
  }

  // Circle operations
  findInCircle(cx: number, cy: number, radius: number, condition: PointValueFilter<T>): PointValue<T> | undefined {
    const { minX, maxX, minY, maxY } = this.bounds.trimNewBounds({
      minX: cx - radius,
      maxX: cx + radius + 1,
      minY: cy - radius,
      maxY: cy + radius + 1,
    })

    const r2 = radius * radius
    const w = this.width

    for (let y = minY; y < maxY; y++) {
      const dy = y - cy
      const dy2 = dy * dy
      const rowOffset = y * w
      for (let x = minX; x < maxX; x++) {
        const dx = x - cx
        if (dx * dx + dy2 <= r2) {
          const idx = rowOffset + x
          const v = this.getRaw(idx)
          if (condition(x, y, v, idx)) return { x, y, value: v }
        }
      }
    }
  }

  filterCircle(cx: number, cy: number, radius: number, condition: PointValueFilter<T>): PointValue<T>[] {
    const results: PointValue<T>[] = []
    this.eachCircle(cx, cy, radius, (x, y, v, idx) => {
      if (condition(x, y, v, idx)) results.push({ x, y, value: v })
    })
    return results
  }

  eachCircle(cx: number, cy: number, radius: number, cb: PointValueInspector<T>): void {
    const { minX, maxX, minY, maxY } = this.bounds.trimNewBounds({
      minX: cx - radius,
      maxX: cx + radius + 1,
      minY: cy - radius,
      maxY: cy + radius + 1,
    })

    const r2 = radius * radius
    const w = this.width

    for (let y = minY; y < maxY; y++) {
      const dy = y - cy
      const dy2 = dy * dy
      const rowOffset = y * w

      for (let x = minX; x < maxX; x++) {
        const dx = x - cx
        if (dx * dx + dy2 <= r2) {
          const idx = rowOffset + x
          cb(x, y, this.getRaw(idx), idx)
        }
      }
    }
  }

  getCircle(cx: number, cy: number, radius: number): T[] {
    const results: T[] = []
    this.eachCircle(cx, cy, radius, (_x, _y, v) => results.push(v))
    return results
  }

  setCircle(cx: number, cy: number, radius: number, value: T): void {
    this.eachCircle(cx, cy, radius, (_x, _y, _v, idx) => this.setRaw(idx, value))
    this.invalidate()
  }

  getCircleBounds(x: number, y: number, radius: number) {
    const minX = Math.max(0, Math.floor(x - radius))
    const maxX = Math.min(this.width - 1, Math.ceil(x + radius))
    const minY = Math.max(0, Math.floor(y - radius))
    const maxY = Math.min(this.height - 1, Math.ceil(y + radius))

    return { minX, maxX, minY, maxY }
  }

  clear(): void {
    this._data.fill(0)
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

  isOneSolidValue(): boolean {
    const first = this.getRaw(0)

    return !this.has((_x, _y, v) => {
      return v !== first
    })
  }

  getUniqueValues() {
    const result = new Set()
    this.each((_x, _y, v) => {
      result.add(this.serializeValue(v))
    })

    return [...result.values()]
  }

  protected serializeValue(value: T): SerializedT {
    return value as unknown as SerializedT
  }

  setEdgeNPadded(value: E, padding: number) {
    for (let i = padding; i < this.width - padding; i++) {
      this.set(i, 0, value)
    }
  }

  setEdgeSPadded(value: E, padding: number) {
    for (let i = padding; i < this.width - padding; i++) {
      this.set(i, this.height - 1, value)
    }
  }

  setEdgeWPadded(value: E, padding: number) {
    for (let i = padding; i < this.height - padding; i++) {
      this.set(0, i, value)
    }
  }

  setEdgeEPadded(value: E, padding: number) {
    for (let i = padding; i < this.height - padding; i++) {
      this.set(this.width - 1, i, value)
    }
  }

  setEdgePadded(edge: Direction, value: E, padding: number) {
    if (edge === 'N') return this.setEdgeNPadded(value, padding)
    if (edge === 'E') return this.setEdgeEPadded(value, padding)
    if (edge === 'S') return this.setEdgeSPadded(value, padding)
    if (edge === 'W') return this.setEdgeWPadded(value, padding)
    throw new Error('invalid edge: ' + edge)
  }

  setEdgeN(value: E, index?: number) {
    if (index !== undefined) {
      this.set(index, 0, value)
      return
    }

    for (let i = 0; i < this.width; i++) {
      this.set(i, 0, value)
    }
  }

  setEdgeS(value: E, index?: number) {
    if (index !== undefined) {
      this.set(index, this.height - 1, value)
      return
    }

    for (let i = 0; i < this.width; i++) {
      this.set(i, this.height - 1, value)
    }
  }

  setEdgeW(value: E, index?: number) {
    if (index !== undefined) {
      this.set(0, index, value)
      return
    }
    for (let i = 0; i < this.height; i++) {
      this.set(0, i, value)
    }
  }

  setEdgeE(value: E, index?: number) {
    if (index !== undefined) {
      this.set(this.width - 1, index, value)
      return
    }
    for (let i = 0; i < this.height; i++) {
      this.set(this.width - 1, i, value)
    }
  }

  setEdge(edge: Direction, value: E, index?: number) {
    if (edge === 'N') return this.setEdgeN(value, index)
    if (edge === 'E') return this.setEdgeE(value, index)
    if (edge === 'S') return this.setEdgeS(value, index)
    if (edge === 'W') return this.setEdgeW(value, index)
    throw new Error('invalid edge: ' + edge)
  }
}

export interface DataStructureConstructor<
  T extends BaseDataStructure<any, any, any, any> = BaseDataStructure<any, any, any, any>
> {
  new(width: number, height: number, ...args: any[]): T
}