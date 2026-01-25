import type { ShallowRef } from 'vue'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { type Selection } from './_canvas-editor-types.ts'
import type { TileGrid } from './data/TileGrid.ts'
import type { TileSheet } from './data/TileSheet.ts'

export type EditorState = ReturnType<typeof makeEditorState>

let id = 0

export function makeEditorState(tileSheet: ShallowRef<TileSheet>, tileGrid: ShallowRef<TileGrid>) {
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
    mouseGridX: null as null | number,
    mouseGridY: null as null | number,

    // only when mouse over tile
    mouseTileId: null as TileId | null,
    mouseTilePixelX: null as null | number,
    mouseTilePixelY: null as null | number,

    // simulated from mouse over grid or tile
    hoverTileId: null as TileId | null,
    hoverTilePixelX: null as number | null,
    hoverTilePixelY: null as number | null,

    lastX: null as null | number,
    lastY: null as null | number,

    mouseDownX: null as null | number,
    mouseDownY: null as null | number,

    isDragging: false,
    dragThreshold: 2,
    dragStartTileId: null as TileId | null,

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
