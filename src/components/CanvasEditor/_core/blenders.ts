import {
  type BinaryMask,
  type Color32,
  fillPixelData,
  fillPixelDataBinaryMask,
  MaskType,
  type NullableMaskRect,
  type PixelData,
} from 'pixel-data-js'

export function clearSelectionRect(target: PixelData, sel: NullableMaskRect): boolean {
  if (sel.data) {
    if (sel.type === MaskType.BINARY) {
      return fillPixelDataBinaryMask(target, 0 as Color32, sel as BinaryMask, sel.x, sel.y)
    } else {
      throw new Error('unsupported mask type')
    }
  } else {
    return fillPixelData(target, 0 as Color32, sel)
  }
}
