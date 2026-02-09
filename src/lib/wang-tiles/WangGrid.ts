import type { Point } from '../node-data-types/BaseDataStructure.ts'

import type { Rect } from '../util/data/Rect.ts'
import { Sketch } from '../util/html-dom/Sketch.ts'
import { AxialEdgeWangTileset, makeEdgesId, type TileId, type WangTile, type WangTileset } from './WangTileset.ts'

export type OverlappingTile<T> = {
  tile: WangTile<T>,
  sourceX: number,
  sourceY: number,
  tileX: number,
  tileY: number,
  tileOverlap: Rect,
  gridOverlap: Rect,
  tileRelativeOffset: Point,
}

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

  each(cb: (x: number, y: number, v: WangTile<T>) => void): void {
    const width = this.width
    const height = this.height

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = this.get(x, y)
        if (t) {
          cb(x, y, t)
        }
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

  mapWithTileId<R>(tileId: string, cb: (x: number, y: number, tile: WangTile<T>) => R): R[] {
    const result = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.get(x, y)
        if (tile?.id === tileId) {
          result.push(cb(x, y, tile))
        }
      }
    }
    return result
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

  getOverlappingTiles(
    rect: Rect,
    tileSize: number,
  ): OverlappingTile<T>[] {
    const results: OverlappingTile<T>[] = []

    const startTileX = Math.floor(rect.x / tileSize)
    const startTileY = Math.floor(rect.y / tileSize)
    const endTileX = Math.floor((rect.x + rect.w - 1) / tileSize)
    const endTileY = Math.floor((rect.y + rect.h - 1) / tileSize)

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const tile = this.get(tx, ty)
        if (!tile) continue

        const tilePx = tx * tileSize
        const tilePy = ty * tileSize

        // Intersection in grid-pixel space
        const ix = Math.max(rect.x, tilePx)
        const iy = Math.max(rect.y, tilePy)
        const ix2 = Math.min(rect.x + rect.w, tilePx + tileSize)
        const iy2 = Math.min(rect.y + rect.h, tilePy + tileSize)

        const iw = ix2 - ix
        const ih = iy2 - iy
        if (iw <= 0 || ih <= 0) continue

        // Tile-local overlap
        const overlapX = ix - tilePx
        const overlapY = iy - tilePy

        // Source-local overlap
        const sourceX = ix - rect.x
        const sourceY = iy - rect.y

        results.push({
          tile,

          // tile coords within the grid (not pixel coords)
          tileX: tx,
          tileY: ty,

          // this overlapping rect's origin relative to the input rect origin
          sourceX,
          sourceY,

          // True tile‑local offset of the selection x,y relative to this tile 0,0 pixel.
          // can be negative.
          tileRelativeOffset: {
            x: overlapX - sourceX,
            y: overlapY - sourceY,
          },

          // Tile‑local clipped rectangle.
          // Intersection of selection rect and tile bounds
          // in tile pixel coord space
          tileOverlap: {
            x: overlapX,
            y: overlapY,
            w: iw,
            h: ih,
          },

          // Grid‑local clipped rectangle.
          // Intersection of selection rect and tile bounds
          // in tile grid pixel coord space
          gridOverlap: {
            x: ix,
            y: iy,
            w: iw,
            h: ih,
          },
        })

      }
    }

    return results
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

export function makeAxialEdgeWangGrid<T>(
  tileset: AxialEdgeWangTileset<T>,
  wrapEdges = true,
): AxialEdgeWangGrid<T> {

  const vertical = tileset.verticalEdgeValues
  const horizontal = tileset.horizontalEdgeValues

  const verticalPairs = makeDeBruijnPairs(vertical)
  const horizontalPairs = makeDeBruijnPairs(horizontal)

  const baseHeight = verticalPairs.length
  const baseWidth = horizontalPairs.length

  const height = wrapEdges ? baseHeight + 2 : baseHeight
  const width = wrapEdges ? baseWidth + 2 : baseWidth

  const grid = new AxialEdgeWangGrid<T>(width, height, tileset)

  // --- Fill the core grid ---
  for (let y = 0; y < baseHeight; y++) {
    const { top: N, bottom: S } = verticalPairs[y]

    for (let x = 0; x < baseWidth; x++) {
      const { top: W, bottom: E } = horizontalPairs[x]

      const edgesId = makeEdgesId<T>(N, E, S, W)
      const tile = tileset.byEdgesId.get(edgesId)
      if (!tile) throw new Error(`Missing tile with edgesId ${edgesId}`)

      const gx = wrapEdges ? x + 1 : x
      const gy = wrapEdges ? y + 1 : y

      grid.set(gx, gy, tile)
    }
  }

  if (!wrapEdges) return grid

  // --- Copy left → right and right → left ---
  for (let y = 1; y <= baseHeight; y++) {
    grid.set(0, y, grid.get(baseWidth, y)!)       // left = rightmost
    grid.set(baseWidth + 1, y, grid.get(1, y)!)   // right = leftmost
  }

  // --- Copy top → bottom and bottom → top ---
  for (let x = 1; x <= baseWidth; x++) {
    grid.set(x, 0, grid.get(x, baseHeight)!)      // top = bottommost
    grid.set(x, baseHeight + 1, grid.get(x, 1)!)  // bottom = topmost
  }

  // --- Copy corners ---
  grid.set(0, 0, grid.get(baseWidth, baseHeight)!)
  grid.set(baseWidth + 1, 0, grid.get(1, baseHeight)!)
  grid.set(0, baseHeight + 1, grid.get(baseWidth, 1)!)
  grid.set(baseWidth + 1, baseHeight + 1, grid.get(1, 1)!)

  return grid
}

function makeDeBruijnPairs<T>(values: readonly T[]): { top: T; bottom: T }[] {
  const n = values.length
  const result: { top: T; bottom: T }[] = []

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const top = values[i]
      const bottom = values[(i + j) % n] // <-- key insight
      result.push({ top, bottom })
    }
  }

  return result
}

export function makeRandomWangGrid<T>(
  tileset: AxialEdgeWangTileset<T>,
  width: number,
  height: number,
): AxialEdgeWangGrid<T> {

  const grid = new AxialEdgeWangGrid<T>(width, height, tileset)

  // Pool of unused tiles (shallow copy)
  const pool = [...tileset.tiles]

  // Helper to remove a tile from the pool
  const removeFromPool = (tile: WangTile<T>) => {
    const i = pool.indexOf(tile)
    if (i !== -1) pool.splice(i, 1)
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      // Determine required edges from neighbors
      const requiredN = y > 0 ? grid.get(x, y - 1)!.edges.S : null
      const requiredW = x > 0 ? grid.get(x - 1, y)!.edges.E : null

      // Filter pool for tiles that match constraints
      const candidates = pool.filter(tile => {
        if (requiredN !== null && tile.edges.N !== requiredN) return false
        if (requiredW !== null && tile.edges.W !== requiredW) return false
        return true
      })

      // If no candidates, fallback to ANY matching tile (allow repeats)
      const fallback = tileset.tiles.filter(tile => {
        if (requiredN !== null && tile.edges.N !== requiredN) return false
        if (requiredW !== null && tile.edges.W !== requiredW) return false
        return true
      })

      const list = candidates.length > 0 ? candidates : fallback

      if (list.length === 0) {
        throw new Error('No valid tile found — tileset may be incomplete')
      }

      // Pick a random tile
      const tile = list[Math.floor(Math.random() * list.length)]

      // Place it
      grid.set(x, y, tile)

      // Remove from pool if possible
      removeFromPool(tile)
    }
  }

  return grid
}

