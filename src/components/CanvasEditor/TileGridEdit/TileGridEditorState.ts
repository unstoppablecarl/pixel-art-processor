import type { AxialEdgeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import { AxialEdgeWangTileset, type TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { BaseEditorState } from '../_core-editor-types.ts'
import { type BaseEditorSettings, makeBaseEditorState } from '../BaseEditorState.ts'
import type { TileGridManager } from './data/TileGridManager.ts'
import type { TileSheet } from './data/TileSheet.ts'

export type TileGridEditorState =
  BaseEditorState &
  BaseTileGridEditorState &
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

interface BaseTileGridEditorState {
  gridTilesWidth: number
  gridTilesHeight: number

  tileSize: number

  readonly gridPixelWidth: number
  readonly gridPixelHeight: number

  readonly gridScreenWidth: number
  readonly gridScreenHeight: number

  readonly scaledTileSize: number

  readonly shouldDrawGrid: boolean

  drawTileIds: boolean

  scale: number

  // tile coords if over tile
  // grid coords if over grid
  mouseLastX: number | null
  mouseLastY: number | null

  // tile coords if over tile
  // grid coords if over grid
  mouseDownX: number | null
  mouseDownY: number | null

  mouseDragStartX: number | null
  mouseDragStartY: number | null

  isDragging: boolean
  dragThreshold: number
  dragStartTileId: TileId | null

  readonly tileSheet: TileSheet
  readonly tileGrid: AxialEdgeWangGrid<number>
  readonly tileGridManager: TileGridManager,
  readonly tileset: AxialEdgeWangTileset<number>

  tileMarginCopySize: number
}

export function makeTileGridEditorState(
  settings: BaseEditorSettings & {
    tileGridManager: TileGridManager
  },
): TileGridEditorState {

  const tileGridManager = settings.tileGridManager

  return {
    ...makeBaseEditorState(settings),
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

    drawTileIds: true,

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

    mouseDragStartX: null,
    mouseDragStartY: null,

    dragStartTileId: null,

    get shouldDrawGrid() {
      return this.scale > 3
    },

    get tileset() {
      return tileGridManager.tileset.value
    },

    get tileSheet() {
      return tileGridManager.tileSheet.value
    },

    get tileGrid() {
      return tileGridManager.tileGrid.value
    },

    get tileGridManager() {
      return tileGridManager
    },

    tileMarginCopySize: 1,
  }
}
