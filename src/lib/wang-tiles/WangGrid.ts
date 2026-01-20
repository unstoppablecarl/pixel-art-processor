import { Sketch } from '../util/html-dom/Sketch.ts'
import { AxialEdgeWangTileset, type TileId, type WangTile, type WangTileset } from './WangTileset.ts'

export class WangGrid<T, TS extends WangTileset<T> = WangTileset<T>> {
  private readonly cells: (WangTile<T> | null)[]

  constructor(
    readonly width: number,
    readonly height: number,
    readonly tileSet: TS,
  ) {
    this.width = width
    this.height = height
    this.cells = Array<WangTile<T> | null>(width * height).fill(null)
  }

  private index(x: number, y: number): number {
    return y * this.width + x
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  get(x: number, y: number): WangTile<T> | null {
    if (!this.inBounds(x, y)) return null
    return this.cells[this.index(x, y)]
  }

  set(x: number, y: number, tile: WangTile<T> | null): void {
    if (!this.inBounds(x, y)) return
    this.cells[this.index(x, y)] = tile
  }

  each(cb: (x: number, y: number, v: WangTile<T> | null) => void): void {
    const width = this.width
    const height = this.height

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        cb(x, y, this.get(x, y))
      }
    }
  }

  filter(cb: (x: number, y: number, tile: WangTile<T> | null) => boolean) {
    const width = this.width
    const height = this.height

    const result = []

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.get(x, y)
        if (cb(x, y, tile)) {
          result.push({ x, y, tile })
        }
      }
    }
    return result
  }

  eachWithTileId(tileId: string, cb: (x: number, y: number, tile: WangTile<T>) => void) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.get(x, y)
        if (tile?.id === tileId) {
          cb(x, y, tile)
        }
      }
    }
  }

  toWrapped(): this {
    const w = this.width
    const h = this.height

    const Ctor = this.constructor as {
      new(width: number, height: number, tileset: TS): WangGrid<T, TS>
    }

    // Create a new instance of the same subclass
    const wrapped = new Ctor(w + 1, h + 1, this.tileSet) as this

    // 1. Copy original grid
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        wrapped.set(x, y, this.get(x, y))
      }
    }

    // 2. Copy first column to last column
    for (let y = 0; y < h; y++) {
      wrapped.set(w, y, this.get(0, y))
    }

    // 3. Copy first row to last row
    for (let x = 0; x < w; x++) {
      wrapped.set(x, h, this.get(x, 0))
    }

    // 4. Bottom-right corner = top-left tile
    wrapped.set(w, h, this.get(0, 0))

    return wrapped
  }

  /** Check if placing tileId at (x, y) is locally valid */
  isPlacementValid(tileset: WangTileset<T>, x: number, y: number, tileId: TileId): boolean {
    const tile = tileset.byId.get(tileId)
    if (!tile) return false

    const upId = this.get(x, y - 1)?.id
    const downId = this.get(x, y + 1)?.id
    const leftId = this.get(x - 1, y)?.id
    const rightId = this.get(x + 1, y)?.id

    if (upId) {
      const upTile = tileset.byId.get(upId)
      if (!upTile || upTile.edges.S !== tile.edges.N) return false
    }

    if (downId) {
      const downTile = tileset.byId.get(downId)
      if (!downTile || downTile.edges.N !== tile.edges.S) return false
    }

    if (leftId) {
      const leftTile = tileset.byId.get(leftId)
      if (!leftTile || leftTile.edges.E !== tile.edges.W) return false
    }

    if (rightId) {
      const rightTile = tileset.byId.get(rightId)
      if (!rightTile || rightTile.edges.W !== tile.edges.E) return false
    }

    return true
  }
}

export class AxialEdgeWangGrid<T> extends WangGrid<T, AxialEdgeWangTileset<T>> {

}

export function makeWangGrid<T>(width: number, height: number, tileset: WangTileset<T>, chooseCandidate?: (candidates: readonly WangTile<T>[]) => WangTile<T>): WangGrid<T> | false {
  const used = new Set<TileId>()

  function getValidCandidates(grid: WangGrid<T>, x: number, y: number): readonly WangTile<T>[] {
    const { tiles } = tileset
    const candidates = tiles.filter(tile => grid.isPlacementValid(tileset, x, y, tile.id))

    const unusedCandidates = candidates.filter(tile => !used.has(tile.id))

    if (unusedCandidates.length > 0) return unusedCandidates
    return candidates
  }

  const grid = new WangGrid<T>(width, height, tileset)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const candidates = getValidCandidates(grid, x, y)

      if (candidates.length === 0) {
        return false
      }

      // const chosen = prng.randomArrayValue(candidates as WangTile<T>[])
      const chosen = chooseCandidate?.(candidates) ?? candidates[0]
      grid.set(x, y, chosen)
      used.add(chosen.id)
    }
  }

  return grid
}

export function drawWangGrid<T>(
  {
    grid,
    width,
    height,
    tileSize,
    edgeThickness,
    colorForEdge,
  }:
  {
    grid: WangGrid<T>,
    width: number,
    height: number,
    tileSize: number,
    edgeThickness: number,
    colorForEdge: (edge: T) => string,
  },
) {

  const sketch = new Sketch(
    width * tileSize,
    height * tileSize,
  )

  const ctx = sketch.ctx

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const tile = grid.get(x, y)
      if (!tile) continue

      const px = x * tileSize
      const py = y * tileSize

      // Draw tile background
      ctx.fillStyle = '#fff'
      ctx.fillRect(px, py, tileSize, tileSize)

      // Edge thickness
      const t = Math.max(2, edgeThickness)

      // North
      ctx.fillStyle = colorForEdge(tile.edges.N)
      ctx.fillRect(px, py, tileSize, t)

      // South
      ctx.fillStyle = colorForEdge(tile.edges.S)
      ctx.fillRect(px, py + tileSize - t, tileSize, t)

      // West
      ctx.fillStyle = colorForEdge(tile.edges.W)
      ctx.fillRect(px, py, t, tileSize)

      // East
      ctx.fillStyle = colorForEdge(tile.edges.E)
      ctx.fillRect(px + tileSize - t, py, t, tileSize)
    }
  }

  return sketch
}

export function makeAxialEdgeWangGrid<T>(tileset: AxialEdgeWangTileset<T>): AxialEdgeWangGrid<T> {
  const northSouthVariants = tileset.verticalEdgeValues
  const eastWestVariants = tileset.horizontalEdgeValues
  // Build all (N,S) pairs
  const verticalPairs = []
  for (const N of northSouthVariants) {
    for (const S of northSouthVariants) {
      verticalPairs.push({ N, S })
    }
  }

  // Build all (W,E) pairs
  const horizontalPairs = []
  for (const W of eastWestVariants) {
    for (const E of eastWestVariants) {
      horizontalPairs.push({ W, E })
    }
  }

  const height = verticalPairs.length
  const width = horizontalPairs.length

  const grid = new AxialEdgeWangGrid<T>(width, height, tileset)

  for (let y = 0; y < height; y++) {
    const { N, S } = verticalPairs[y]

    for (let x = 0; x < width; x++) {
      const { W, E } = horizontalPairs[x]

      const id = `tile-${N}-${E}-${S}-${W}` as TileId
      const tile = tileset.byId.get(id)
      if (!tile) throw new Error('failed to generate tile grid')

      grid.set(x, y, tile)
    }
  }

  return grid
}