import {
  type BinaryMask,
  type BlendColor32,
  blendPixelData,
  blendPixelDataBinaryMask,
  MaskType,
  type PixelData,
} from '../../../../../../pixel-data-js/src'
import type { DrawRect } from './ISelection.ts'

export function blendSheetDrawRects(target: PixelData, r: DrawRect, src: PixelData, blendFn: BlendColor32): boolean {
  const opts = {
    x: r.dx,
    y: r.dy,
    sx: r.sx,
    sy: r.sy,
    w: r.w,
    h: r.h,
    blendFn,
  }

  if (r.type === MaskType.BINARY) {
    return blendPixelDataBinaryMask(target, src, r as BinaryMask, opts)
  } else if (r.type === MaskType.ALPHA) {
    throw new Error('unsupported mask type')
  } else {
    return blendPixelData(target, src, opts)
  }
}