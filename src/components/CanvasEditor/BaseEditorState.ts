import type { BaseEditorState } from './_canvas-editor-types.ts'

export function makeBaseEditorState(): BaseEditorState {
  return {
    scale: 4,

    mouseLastX: null,
    mouseLastY: null,

    mouseDownX: null,
    mouseDownY: null,

    mouseDragStartX: null,
    mouseDragStartY: null,

    isDragging: false,
    dragThreshold: 2,

    gridColor: 'rgba(0, 0, 0, 0.2)',
    cursorColor: 'rgba(0, 255, 255, 1)',

    get shouldDrawGrid() {
      return this.scale > 3
    },
  }
}
