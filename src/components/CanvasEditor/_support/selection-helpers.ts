import type { RectBounds } from '../../../lib/util/data/Bounds.ts'
import {
  type BlendFn,
  blendIgnoreTransparent,
  blendImageDataIgnoreSolid,
  blendImageDataIgnoreTransparent,
  blendOverwrite,
  blendSourceAlphaOver,
  type ImageDataBlendFn,
} from '../../../lib/util/html-dom/blit.ts'
import { writeImageData } from '../../../lib/util/html-dom/ImageData.ts'
import { BlendMode } from '../_core-editor-types.ts'

export const selectMoveBlendModeToBlendFn: Record<BlendMode, BlendFn | undefined> = {
  [BlendMode.OVERWRITE]: blendOverwrite,
  [BlendMode.IGNORE_TRANSPARENT]: blendIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendSourceAlphaOver(0.5),
}

export const selectMoveBlendModeToWriter: Record<BlendMode, ImageDataBlendFn> = {
  [BlendMode.OVERWRITE]: writeImageData,
  [BlendMode.IGNORE_TRANSPARENT]: blendImageDataIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendImageDataIgnoreSolid,
}

export function drawSelectOutline(ctx: CanvasRenderingContext2D, scale: number, rect: RectBounds) {
  const { x, y, w, h } = rect
  ctx.strokeStyle = 'cyan'
  ctx.lineWidth = 1
  ctx.strokeRect(
    x * scale - 0.5,
    y * scale - 0.5,
    w * scale + 1,
    h * scale + 1,
  )
}

import { useDocumentClick } from '../../../lib/util/vue-util'
import {
  DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK,
  DATA_LOCAL_TOOL_ID,
  Tool,
} from '../_core-editor-types'

export interface SelectionCancelDeps<State, Toolset, LocalToolStates> {
  id: string
  state: State & {
    isDragging: boolean
    mouseDownX: number | null
    mouseDownY: number | null
  }
  toolset: Toolset & {
    currentTool: Tool
  }
  localToolStates: LocalToolStates & {
    [Tool.SELECT]: { clearSelection(): void }
  }
}

export function useSelectionCancelOnDocumentClick<
  State,
  Toolset,
  LocalToolStates
>(deps: SelectionCancelDeps<State, Toolset, LocalToolStates>) {
  const { id, state, toolset, localToolStates } = deps

  useDocumentClick((t) => {
    if (state.isDragging) return
    if (toolset.currentTool !== Tool.SELECT) return
    if (state.mouseDownX !== null || state.mouseDownY !== null) return
    if (t.closest(`[${DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK}]`)) return
    if (t.getAttribute(DATA_LOCAL_TOOL_ID) === id) return

    localToolStates[Tool.SELECT].clearSelection()
  })
}
