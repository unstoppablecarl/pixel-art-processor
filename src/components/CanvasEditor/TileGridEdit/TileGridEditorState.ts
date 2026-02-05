import type { Ref } from 'vue'
import type { AxialEdgeWangGrid } from '../../../lib/wang-tiles/WangGrid.ts'
import { AxialEdgeWangTileset, type TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { BaseEditorState } from '../_core-editor-types.ts'
import { type BaseEditorSettings, EditorState } from '../BaseEditorState.ts'
import type { TileGridGeometry } from './data/TileGridGeometry.ts'
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
  readonly tileGridGeometry: TileGridGeometry,
  readonly tileset: AxialEdgeWangTileset<number>

  tileMarginCopySize: number
}

type TileGridEditorSettings = BaseEditorSettings & {
  tileGridManager: TileGridManager,
  tileGridGeometry: Ref<TileGridGeometry>,
}

class TileGridEditorStateC extends EditorState {

  public tileSize = 64

  public drawTileIds = true

  // only when mouse over grid
  public mouseGridX: number | null = null
  public mouseGridY: number | null = null

  // only when mouse over tile
  public mouseTileId: number | null = null
  public mouseTilePixelX: number | null = null
  public mouseTilePixelY: number | null = null

  // simulated from mouse over grid or tile
  public hoverTileId: number | null = null
  public hoverTilePixelX: number | null = null
  public hoverTilePixelY: number | null = null

  public mouseDragStartX: number | null = null
  public mouseDragStartY: number | null = null

  public dragStartTileId: number | null = null

  public tileMarginCopySize = 1

  protected _tileGridManager: TileGridManager
  protected _tileGridGeometry: Ref<TileGridGeometry>

  constructor(settings: TileGridEditorSettings) {
    super(settings)

    this._tileGridManager = settings.tileGridManager
    this._tileGridGeometry = settings.tileGridGeometry
  }

  get gridPixelWidth() {
    return this.gridTilesWidth * this.tileSize
  }

  get gridPixelHeight() {
    return this.gridTilesWidth * this.tileSize
  }

  get gridScreenWidth() {
    return this.scale * this.gridTilesWidth * this.tileSize
  }

  get gridScreenHeight() {
    return this.scale * this.gridTilesHeight * this.tileSize
  }

  get scaledTileSize() {
    return this.scale * this.tileSize
  }

  get tileset() {
    return this._tileGridManager.tileset.value
  }

  get tileSheet() {
    return this._tileGridManager.tileSheet.value
  }

  get tileGrid() {
    return this._tileGridManager.tileGrid.value
  }

  get tileGridGeometry() {
    return this._tileGridGeometry.value
  }

  get tileGridManager() {
    return this._tileGridManager
  }

  get gridTilesWidth() {
    return this._tileGridManager.tileGrid.value.width
  }

  get gridTilesHeight() {
    return this._tileGridManager.tileGrid.value.height
  }
}

export function makeTileGridEditorState(
  settings: TileGridEditorSettings,
) {
  return new TileGridEditorStateC(settings) as TileGridEditorState
}
