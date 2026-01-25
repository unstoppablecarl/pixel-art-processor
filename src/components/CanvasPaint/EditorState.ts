import type { ShallowRef } from 'vue'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { type Selection } from './_canvas-editor-types.ts'
import type { TileGrid } from './data/TileGrid.ts'
import type { TileSheet } from './data/TileSheet.ts'

let id = 0

export type EditorState =
  BaseEditorState &
  HoverTileState &
  MouseTileState &
  MouseGridState

// unified hover state
type HoverTileState =
  | {
  hoverTileId: TileId
  hoverTilePixelX: number
  hoverTilePixelY: number
}
  | {
  hoverTileId: null
  hoverTilePixelX: null
  hoverTilePixelY: null
}

// only when mouse over tile
type MouseTileState =
  | {
  mouseTileId: TileId
  mouseTilePixelX: number
  mouseTilePixelY: number
}
  | {
  mouseTileId: null
  mouseTilePixelX: null
  mouseTilePixelY: null
}

// only when mouse over grid
type MouseGridState =
  | {
  mouseGridX: number
  mouseGridY: number
}
  | {
  mouseGridX: null
  mouseGridY: null
}

interface BaseEditorState {
  id: number

  gridTilesWidth: number
  gridTilesHeight: number

  tileSize: number

  readonly gridPixelWidth: number
  readonly gridPixelHeight: number

  readonly gridScreenWidth: number
  readonly gridScreenHeight: number

  readonly scaledTileSize: number

  scale: number

  // tile coords if over tile
  // grid coords if over grid
  mouseLastX: number | null
  mouseLastY: number | null

  // tile coords if over tile
  // grid coords if over grid
  mouseDownX: number | null
  mouseDownY: number | null

  isDragging: boolean
  dragThreshold: number
  dragStartTileId: TileId | null

  gridColor: string
  cursorColor: string

  emitSetPixels: ((pixels: { x: number; y: number }[]) => void) | null

  selecting: boolean
  selectionData: Selection | null

  readonly tileSheet: TileSheet
  readonly tileGrid: TileGrid

  tileMarginCopySize: number
}

export function makeEditorState(tileSheet: ShallowRef<TileSheet>, tileGrid: ShallowRef<TileGrid>): EditorState {
  return {
    id: id++,

    gridTilesWidth: 1,
    gridTilesHeight: 1,

    tileSize: 64,

    get gridPixelWidth() {
      return this.gridTilesWidth * this.tileSize
    },

    get gridPixelHeight() {
      return this.gridTilesWidth * this.tileSize
    },

    get gridScreenWidth() {
      return this.scale * this.gridTilesWidth * this.tileSize
    },

    get gridScreenHeight() {
      return this.scale * this.gridTilesHeight * this.tileSize
    },

    get scaledTileSize() {
      return this.scale * this.tileSize
    },

    scale: 8,

    // only when mouse over grid
    mouseGridX: null,
    mouseGridY: null,

    // only when mouse over tile
    mouseTileId: null,
    mouseTilePixelX: null,
    mouseTilePixelY: null,

    // simulated from mouse over grid or tile
    hoverTileId: null,
    hoverTilePixelX: null,
    hoverTilePixelY: null,

    mouseLastX: null,
    mouseLastY: null,

    mouseDownX: null,
    mouseDownY: null,

    isDragging: false,
    dragThreshold: 2,
    dragStartTileId: null,

    gridColor: 'rgba(0, 0, 0, 0.2)',
    cursorColor: 'rgba(0, 255, 255, 1)',

    emitSetPixels: null as ((pixels: { x: number; y: number }[]) => void) | null,

    selecting: false,
    selectionData: null as null | Selection,

    get tileSheet() {
      return tileSheet.value
    },

    get tileGrid() {
      return tileGrid.value
    },

    tileMarginCopySize: 1,
  }
}
