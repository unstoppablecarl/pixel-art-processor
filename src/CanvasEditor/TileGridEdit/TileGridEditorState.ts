import { computed, type Ref } from 'vue'
import type { AxialEdgeWangGrid } from '../../lib/wang-tiles/WangGrid.ts'
import { AxialEdgeWangTileset, type TileId } from '../../lib/wang-tiles/WangTileset.ts'
import type { BaseEditorState } from '../_core/_core-editor-types.ts'
import { type BaseEditorSettings, EditorState } from '../_core/BaseEditorState.ts'
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
  tileSize: number

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

  readonly reactive: ReturnType<typeof makeReactive>
}

export type TileGridEditorSettings = BaseEditorSettings & {
  tileGridManager: TileGridManager,
  tileGridGeometry: TileGridGeometry,
  showTileIds: Ref<boolean>,
  showTileEdgeColors: Ref<boolean>,
  showTileEdgeColorsOpacity: Ref<number>,
}

function makeReactive(settings: TileGridEditorSettings) {
  return {
    tileSize: settings.tileGridManager.tileSize,
    scaledTileSize: computed(() => settings.tileGridManager.tileSize.value * settings.scale.value),

    tileGridManager: settings.tileGridManager,
    tileGrid: settings.tileGridManager.tileGrid,
    tileSheet: settings.tileGridManager.tileSheet,
    tileset: settings.tileGridManager.tileset,

    showGrid: settings.showGrid,
    showGridColor: settings.showGridColor,
    showTileIds: settings.showTileIds,
    showTileEdgeColors: settings.showTileEdgeColors,
    showTileEdgeColorsOpacity: settings.showTileEdgeColorsOpacity,

    scale: settings.scale,
  }
}

class TileGridEditorStateC extends EditorState {

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

  readonly tileGridManager: TileGridManager
  readonly tileGridGeometry: TileGridGeometry

  readonly reactive: ReturnType<typeof makeReactive>

  constructor(settings: TileGridEditorSettings) {
    super(settings)

    this.reactive = makeReactive(settings)

    this.tileGridManager = settings.tileGridManager
    this.tileGridGeometry = settings.tileGridGeometry
  }

  get tileSize() {
    return this.reactive.tileSize.value
  }

  get tileset() {
    return this.reactive.tileset.value
  }

  get tileSheet() {
    return this.reactive.tileSheet.value
  }

  get tileGrid() {
    return this.reactive.tileGrid.value
  }
}

export function makeTileGridEditorState(
  settings: TileGridEditorSettings,
) {
  return new TileGridEditorStateC(settings) as TileGridEditorState
}
