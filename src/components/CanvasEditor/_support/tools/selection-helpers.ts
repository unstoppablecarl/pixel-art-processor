import type { RectBounds } from '../../../../lib/util/data/Bounds.ts'
import {
  type BlendFn,
  blendIgnoreTransparent,
  blendImageDataIgnoreSolid,
  blendImageDataIgnoreTransparent,
  blendImageDataOverwrite,
  blendOverwrite,
  blendSourceAlphaOver,
  type ImageDataBlendFn,
} from '../../../../lib/util/html-dom/blit.ts'
import { useDocumentClick } from '../../../../lib/util/vue-util.ts'
import { BlendMode, DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK, DATA_LOCAL_TOOL_ID, Tool } from '../../_core-editor-types.ts'

export const selectMoveBlendModeToBlendFn: Record<BlendMode, BlendFn | undefined> = {
  [BlendMode.OVERWRITE]: blendOverwrite,
  [BlendMode.IGNORE_TRANSPARENT]: blendIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendSourceAlphaOver(0.5),
}

export const selectMoveBlendModeToWriter: Record<BlendMode, ImageDataBlendFn> = {
  [BlendMode.OVERWRITE]: blendImageDataOverwrite,
  [BlendMode.IGNORE_TRANSPARENT]: blendImageDataIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendImageDataIgnoreSolid,
}

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

export function drawSelectOutline(
  ctx: CanvasRenderingContext2D,
  scale: number,
  rect: RectBounds,
  color: string,
  mask?: Uint8Array | null,
) {
  const { x: rx, y: ry, w, h } = rect
  ctx.fillStyle = color

  const dashPeriod = 4

  if (!mask) {
    const x = rx * scale
    const y = ry * scale
    const ww = w * scale
    const hh = h * scale

    for (let ix = 0; ix < ww; ix++) {
      if ((ix % dashPeriod) === 0) {
        ctx.fillRect(x + ix, y - 1, 1, 1)
        ctx.fillRect(x + ix, y + hh, 1, 1)
      }
    }
    for (let iy = 0; iy < hh; iy++) {
      if ((iy % dashPeriod) === 0) {
        ctx.fillRect(x - 1, y + iy, 1, 1)
        ctx.fillRect(x + ww, y + iy, 1, 1)
      }
    }
    return
  }

  for (let iy = 0; iy < h; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const i = iy * w + ix
      if (mask[i] === 0) continue
      if (((ix + iy) % dashPeriod) !== 0) continue

      const left = ix === 0 || mask[i - 1] === 0
      const right = ix === w - 1 || mask[i + 1] === 0
      const top = iy === 0 || mask[i - w] === 0
      const bottom = iy === h - 1 || mask[i + w] === 0

      const px = (rx + ix) * scale
      const py = (ry + iy) * scale

      if (top) {
        for (let sx = 0; sx < scale; sx++) {
          ctx.fillRect(px + sx, py - 1, 1, 1)
        }
      }
      if (bottom) {
        for (let sx = 0; sx < scale; sx++) {
          ctx.fillRect(px + sx, py + scale, 1, 1)
        }
      }
      if (left) {
        for (let sy = 0; sy < scale; sy++) {
          ctx.fillRect(px - 1, py + sy, 1, 1)
        }
      }
      if (right) {
        for (let sy = 0; sy < scale; sy++) {
          ctx.fillRect(px + scale, py + sy, 1, 1)
        }
      }
    }
  }
}
