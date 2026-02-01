import type { Ref } from 'vue'
import { type ImageDataRef } from '../../../lib/vue/vue-image-data.ts'
import { type BaseEditorSettings, makeBaseEditorState } from '../BaseEditorState.ts'

export type CanvasPaintEditorState = ReturnType<typeof makCanvasPaintEditorState>
export type CanvasPaintEditorSettings = BaseEditorSettings & {
  width: Ref<number>,
  height: Ref<number>,
  imageDataRef: ImageDataRef,
}

export function makCanvasPaintEditorState(settings: CanvasPaintEditorSettings) {

  return {
    ...makeBaseEditorState(settings),
    get width() {
      return settings.width.value
    },
    get height() {
      return settings.height.value
    },
    get scaledWidth(): number {
      return this.scale * this.width
    },
    get scaledHeight(): number {
      return this.scale * this.height
    },
    imageDataRef: settings.imageDataRef,
    imageDataDirty: false,
  }
}