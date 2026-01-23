import type { ImageDataRef } from '../../lib/vue/vue-image-data.ts'
import { type DrawLayer } from './_canvas-editor-types.ts'
import type { Selection } from './tools/select.ts'

export type EditorState = ReturnType<typeof makeEditorState>

let id = 0

export function makeEditorState() {
  return {
    id: id++,
    width: 64,
    height: 64,
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

    get scaledWidth() {
      return this.scale * this.width
    },

    get scaledHeight() {
      return this.scale * this.height
    },

    pixelOverlayDraw: null as DrawLayer | null,
    screenOverlayDraw: null as DrawLayer | null,

    emitSetPixels: null as ((pixels: { x: number; y: number }[]) => void) | null,

    selecting: false,
    selectionData: null as null | Selection,

    target: null as null | ImageDataRef,
  }
}

