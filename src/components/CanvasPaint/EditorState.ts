import type { ShallowRef } from 'vue'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { type DrawLayer, type Selection } from './_canvas-editor-types.ts'
import type { TileSheet } from './data/TileSheet.ts'

export type EditorState = ReturnType<typeof makeEditorState>

let id = 0

export function makeEditorState(tileSheet: ShallowRef<TileSheet>) {
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

    cursorX: 0,
    cursorY: 0,

    isMouseOver: false,
    isDragging: false,
    dragThreshold: 2,
    lastX: null as null | number,
    lastY: null as null | number,
    mouseDownX: null as null | number,
    mouseDownY: null as null | number,

    gridColor: 'rgba(0, 0, 0, 0.2)',
    cursorColor: 'rgba(0, 255, 255, 1)',

    tilePixelOverlayDraw: null as DrawLayer | null,
    tileScreenOverlayDraw: null as DrawLayer | null,

    emitSetPixels: null as ((pixels: { x: number; y: number }[]) => void) | null,

    selecting: false,
    selectionData: null as null | Selection,

    get tileSheet() {
      return tileSheet.value
    },

    tileMarginCopySize: 1,

    mouseOverGrid: false,
    mouseOverTileId: null as TileId | null,
    mouseOverTilePixelX: null as null | number,
    mouseOverTilePixelY: null as null | number,
  }
}
