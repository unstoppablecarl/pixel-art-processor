import type { Rect } from '../../../../lib/util/data/Rect.ts'
import {
  type BlendFn,
  blendIgnoreSolid,
  blendIgnoreTransparent,
  blendImageDataIgnoreSolid,
  blendImageDataIgnoreTransparent,
  blendImageDataOverwrite,
  blendOverwrite,
  type ImageDataBlendFn,
} from '../../../../lib/util/html-dom/blit.ts'
import {
  type BaseSelectToolState,
  BlendMode,
  DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK,
  TOOL_HOVER_CSS_CLASSES,
} from '../_core-editor-types.ts'

export const selectMoveBlendModeToBlendFn: Record<BlendMode, BlendFn> = {
  [BlendMode.OVERWRITE]: blendOverwrite,
  [BlendMode.IGNORE_TRANSPARENT]: blendIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendIgnoreSolid,
}

export const selectMoveBlendModeToWriter: Record<BlendMode, ImageDataBlendFn> = {
  [BlendMode.OVERWRITE]: blendImageDataOverwrite,
  [BlendMode.IGNORE_TRANSPARENT]: blendImageDataIgnoreTransparent,
  [BlendMode.IGNORE_SOLID]: blendImageDataIgnoreSolid,
}

export function drawSelectOutline(
  ctx: CanvasRenderingContext2D,
  scale: number,
  rect: Rect,
  color: string,
  mask?: Uint8Array | null,
) {
  const { x: rx, y: ry, w, h } = rect
  ctx.fillStyle = color

  const dashPeriod = 1

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

export function selectHandlerDocumentClick(cb: () => void) {
  return (t: HTMLElement) => {
    if (t.closest(`[${DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK}]`)) return
    cb()
  }
}

export function makeBaseSelectHandler(toolState: BaseSelectToolState) {
  return {
    cursorCssClass: TOOL_HOVER_CSS_CLASSES.SELECT,
    onDocumentClick(t: HTMLElement) {
      if (t.closest(`[${DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK}]`)) return
      toolState.clearSelection()
    },
  }
}