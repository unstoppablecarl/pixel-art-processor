import { type Ref } from 'vue'
import type { BaseEditorState } from './_core-editor-types.ts'

export type BaseEditorSettings = {
  id: string,
  showGrid: Ref<boolean>,
  showGridColor: Ref<string>
  scale: Ref<number>
}

export class EditorState implements BaseEditorState {
  protected _showGrid: Ref<boolean>
  protected _showGridColor: Ref<string>
  protected _scale: Ref<number>
  public mouseX: number | null = null
  public mouseY: number | null = null
  public mouseLastX: number | null = null
  public mouseLastY: number | null = null
  public mouseDownX: number | null = null
  public mouseDownY: number | null = null
  public mouseDragStartX: number | null = null
  public mouseDragStartY: number | null = null
  public id: string
  public isDragging = false
  public dragThreshold = 2

  constructor({
                id,
                scale,
                showGrid,
                showGridColor,
              }: BaseEditorSettings,
  ) {
    this.id = id
    this._scale = scale
    this._showGrid = showGrid
    this._showGridColor = showGridColor
  }

  get scale() {
    return this._scale.value
  }

  shouldDrawGrid() {
    return this._showGrid.value && this._scale.value > 3
  }

  get showGridColor() {
    return this._showGridColor.value
  }
}