import { type Rect } from '../../../../lib/util/data/Rect.ts'

export type CanvasPaintSelection = ReturnType<typeof makeCanvasPaintSelection>

export type CanvasPaintSelectionOpts = {
  rect: Rect,
  pastedPixels?: ImageData | null,
  mask?: Uint8Array | null,
}

export function makeCanvasPaintSelection(
  {
    rect,
    pastedPixels = null,
    mask = null,
  }: CanvasPaintSelectionOpts) {

  let current = { ...rect }
  const original = { ...rect }
  let pixels = pastedPixels

  let anchorX: number | null = null
  let anchorY: number | null = null

  let dragStartX: number | null = null
  let dragStartY: number | null = null

  function startMoving(mouseX: number, mouseY: number) {
    dragStartX = mouseX
    dragStartY = mouseY
    anchorX = current.x
    anchorY = current.y
  }

  // promotes a Marquee to a Floating Layer by providing pixels.
  function lift(imgData: ImageData) {
    pixels = imgData
  }

  function move(mouseX: number, mouseY: number) {
    if (dragStartX === null || dragStartY === null) return
    if (anchorX === null || anchorY === null) return

    const dx = mouseX - dragStartX
    const dy = mouseY - dragStartY

    current = {
      ...current,
      x: anchorX + dx,
      y: anchorY + dy,
    }
  }

  function pointInSelection(px: number, py: number) {
    const lx = px - current.x
    const ly = py - current.y

    if (lx < 0 || ly < 0 || lx >= current.w || ly >= current.h) return false

    if (mask) {
      return mask[ly * current.w + lx] !== 0
    }
    return true
  }

  function hasMoved() {
    return original.x !== current.x || original.y !== current.y
  }

  return {
    get pixels() {
      return pixels
    },
    get mask() {
      return mask
    },
    get original() {
      return original
    },
    get current() {
      return current
    },
    get isPasted() {
      return !!pastedPixels
    },
    lift,
    startMoving,
    move,
    pointInSelection,
    hasMoved,
  }
}