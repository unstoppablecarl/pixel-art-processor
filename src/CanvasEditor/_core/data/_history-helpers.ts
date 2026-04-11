import { extractPixelDataBuffer, type PixelData } from '../../../../../pixel-data-js/src'

export type ProtoPatch = {
  x: number
  y: number
  w: number
  h: number
  before: Uint32Array
  after: Uint32Array | null
}

export type Patch = Omit<ProtoPatch, 'after'> & {
  after: Uint32Array
}

export function finalizePatch<Proto extends ProtoPatch, P extends Patch>(
  p: Proto,
  img: PixelData,
  offsetX = 0,
  offsetY = 0,
): P {
  // Assuming extractPixelData now returns Uint32Array as discussed
  p.after = extractPixelDataBuffer(img, {
    x: p.x + offsetX,
    y: p.y + offsetY,
    w: p.w,
    h: p.h,
  })

  return p as unknown as P
}