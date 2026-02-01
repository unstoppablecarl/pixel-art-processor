import { ref, type Ref } from 'vue'
import type { BaseEditorState } from './_core-editor-types.ts'

export type BaseEditorSettings = {
  gridColor?: Ref<string>,
  scale?: Ref<number>
}

export function makeBaseEditorState(
  {
    scale = ref(1),
    gridColor = ref('rgba(0, 0, 0, 0.2)'),
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

    // @TODO remove these and sync manually this wont work
    get gridColor() {
      return gridColor.value
    },

    get shouldDrawGrid() {
      return this.scale > 3
    },
  }
}
