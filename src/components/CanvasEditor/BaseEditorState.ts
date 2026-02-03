import { ref, type Ref } from 'vue'
import type { BaseEditorState } from './_core-editor-types.ts'

export type BaseEditorSettings = {
  gridDraw?: Ref<boolean>,
  scale?: Ref<number>
}

export function makeBaseEditorState(
  {
    scale = ref(1),
    gridDraw = ref(true),
  }: BaseEditorSettings,
): BaseEditorState {

  return {
    get scale() {
      return scale.value
    },

    mouseX: null,
    mouseY: null,

    mouseLastX: null,
    mouseLastY: null,

    mouseDownX: null,
    mouseDownY: null,

    mouseDragStartX: null,
    mouseDragStartY: null,

    isDragging: false,
    dragThreshold: 2,

    get shouldDrawGrid() {
      return gridDraw.value && this.scale > 3
    },
  }
}
