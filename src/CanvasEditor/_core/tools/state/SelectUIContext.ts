import type { Ref } from 'vue'
import type { CanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { SelectMoveMode } from '../../_core-editor-types.ts'

export type SelectUIContext = ReturnType<typeof makeSelectUIContext>

export function makeSelectUIContext(
  store: CanvasEditToolStore,
  currentCursorCssClass: Ref<string | null>,
) {
  return {
    setCursorState: (isOverSelection: boolean) => {
      let state = ''
      if (isOverSelection) {
        state = (store.selectionMoveMode === SelectMoveMode.CONTENT
          ? 'over-selection-move-content'
          : 'over-selection-move-selection')
      }

      currentCursorCssClass.value = state
    },
  }
}