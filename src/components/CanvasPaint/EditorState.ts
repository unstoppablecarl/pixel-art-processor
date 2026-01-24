import type { Point } from '../../lib/node-data-types/BaseDataStructure.ts'
import type { TileId } from '../../lib/wang-tiles/WangTileset.ts'
import { type DrawLayer, type Selection, type TilesetImageRefs } from './_canvas-editor-types.ts'

export type EditorState = ReturnType<typeof makeEditorState>

let id = 0

export function makeEditorState(tilesetImageRefs: TilesetImageRefs) {
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

    tilesetImageRefs,

    tileMarginCopySize: 1,
    gridPixelToTilePixel(gridPixelX: number, gridPixelY: number): Point {
      return {
        x: gridPixelX % this.tileSize,
        y: gridPixelY % this.tileSize,
      }
    },

    tilePixelToGridPixel(tileX: number, tileY: number, pixelX = 0, pixelY = 0): Point {
      return {
        x: tileX * this.tileSize + pixelX,
        y: tileY * this.tileSize + pixelY,
      }
    },

    mouseOverGrid: false,
    mouseOverTileId: null as TileId | null,
    mouseOverTilePixelX: null as null | number,
    mouseOverTilePixelY: null as null | number,
  }
}
