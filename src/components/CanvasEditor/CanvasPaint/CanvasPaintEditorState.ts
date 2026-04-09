import type { Ref } from 'vue'
import type { PixelDataRef } from '../../../lib/vue/PixelDataRef.ts'
import { type BaseEditorSettings, EditorState } from '../_core/BaseEditorState.ts'

export type CanvasPaintEditorSettings = BaseEditorSettings & {
  width: Ref<number>
  height: Ref<number>
  pixelDataRef: PixelDataRef
}

export class CanvasPaintEditorState extends EditorState {
  protected _width: Ref<number>
  protected _height: Ref<number>
  public pixelDataRef: PixelDataRef
  public imageDataDirty = false

  constructor(settings: CanvasPaintEditorSettings) {
    super(settings)
    this._width = settings.width
    this._height = settings.height
    this.pixelDataRef = settings.pixelDataRef
  }

  get width() {
    return this._width.value
  }

  get height() {
    return this._height.value
  }

  get scaledWidth(): number {
    return this._scale.value * this.width
  }

  get scaledHeight(): number {
    return this._scale.value * this.height
  }
}

export function makCanvasPaintEditorState(settings: CanvasPaintEditorSettings) {
  return new CanvasPaintEditorState(settings)
}