import {
  type BinaryMask,
  type BlendColor32,
  blendPixelData,
  blendPixelDataBinaryMask,
  type Color32,
  fillPixelData,
  fillPixelDataBinaryMask,
  MaskType,
  type PixelData,
} from '../../../../../../pixel-data-js/src'
import type { DrawRect } from './ISelection.ts'

export function blendSheetDrawRect(target: PixelData, r: DrawRect, src: PixelData, blendFn: BlendColor32): boolean {
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
  }
  return blendPixelData(target, src, opts)
}

export function clearSheetDrawRect(target: PixelData, r: DrawRect): boolean {
  const empty = 0 as Color32

  if (r.type === MaskType.BINARY) {
    return fillPixelDataBinaryMask(target, empty, r as BinaryMask, r.dx, r.dy)
  } else if (r.type === MaskType.ALPHA) {
    throw new Error('unsupported mask type')
  }

  return fillPixelData(target, empty, r.dx, r.dy, r.w, r.h)
}