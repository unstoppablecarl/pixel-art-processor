import { prng } from '../util/prng.ts'
import { Sketch } from '../util/Sketch.ts'
import type { TileId, WangTile, WangTileset } from './WangTileset.ts'

export class WangGrid<T> {
  readonly width: number
  readonly height: number
  private readonly cells: (WangTile<T> | null)[]

  constructor(width: number, height: number) {
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

  set(x: number, y: number, tile: WangTile<T>): void {
    if (!this.inBounds(x, y)) return
    this.cells[this.index(x, y)] = tile
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

export function makeWangGrid<T>(width: number, height: number, tileset: WangTileset<T>): WangGrid<T> {
  function getValidCandidates(grid: WangGrid<T>, x: number, y: number): readonly WangTile<T>[] {
    const { tiles } = tileset
    return tiles.filter(tile => grid.isPlacementValid(tileset, x, y, tile.id))
  }

  const grid = new WangGrid<T>(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const candidates = getValidCandidates(grid, x, y)

      if (candidates.length === 0) {
        throw new Error(`No valid tiles for position (${x}, ${y}). `)
      }

      const chosen = prng.randomArrayValue(candidates as WangTile<T>[])
      grid.set(x, y, chosen)
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
      console.log(ctx.fillStyle )
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
