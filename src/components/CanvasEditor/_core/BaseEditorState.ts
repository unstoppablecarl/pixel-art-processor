import { ref, type Ref } from 'vue'
import type { BaseEditorState } from './_core-editor-types.ts'

export type BaseEditorSettings = {
  id: string,
  gridDraw?: Ref<boolean>,
  scale: Ref<number>
}

export class EditorState implements BaseEditorState {
  protected _gridDraw: Ref<boolean>
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
                gridDraw = ref(true),
              }: BaseEditorSettings,
  ) {
    this.id = id
    this._scale = scale
    this._gridDraw = gridDraw
  }

  get scale() {
    return this._scale.value
  }

  shouldDrawGrid() {
    return this._gridDraw.value && this._scale.value > 3
  }
}