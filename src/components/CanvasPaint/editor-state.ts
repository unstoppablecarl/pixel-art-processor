import type { ImageDataRef } from '../../lib/vue/vue-image-data.ts'
import { type DrawLayer, Tool } from './_canvas-editor-types.ts'
import { BrushShape } from './tools/brush.ts'
import type { Selection } from './tools/select.ts'

export type EditorState = ReturnType<typeof makeEditorState>

export function makeEditorState() {
  return {
    width: 64,
    height: 64,
    scale: 8,

    cursorX: 0,
    cursorY: 0,
    mouseIsOver: false,
    isDrawing: false,
    lastX: 0,
    lastY: 0,

    tool: Tool.BRUSH as Tool,
    brushSize: 1,
    brushShape: BrushShape.CIRCLE as BrushShape,

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
    selection: null as null | Selection,

    target: null as null | ImageDataRef,
  }
}