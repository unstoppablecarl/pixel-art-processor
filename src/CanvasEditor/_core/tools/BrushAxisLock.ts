import type { CanvasEditToolStore } from '../../../lib/store/canvas-edit-tool-store.ts'

export enum LockedAxis {
  NONE,
  VERTICAL,
  HORIZONTAL,
}

const SCRATCH = {
  x: 0,
  y: 0,
  lastDrawnX: 0,
  lastDrawnY: 0,
}

export type BrushAxisLock = ReturnType<typeof makeBrushAxisLock>

export function makeBrushAxisLock(
  store: CanvasEditToolStore,
  // pixels of movement required to "commit" to an axis
  threshold = 3,
) {
  let lastDrawnX: number | null = null
  let lastDrawnY: number | null = null

  let lockOriginX: number | null = null
  let lockOriginY: number | null = null

  let lockedAxis = LockedAxis.NONE

  function track(x: number, y: number) {
    lastDrawnX = x
    lastDrawnY = y
    lockOriginX = null
    lockOriginY = null
    lockedAxis = LockedAxis.NONE
  }

  return {
    onMouseDown: track,
    onDragStart: track,
    onDragMove(x: number, y: number): typeof SCRATCH | undefined {
      if (lastDrawnX == null || lastDrawnY == null) return

      let cx = x
      let cy = y

      const lockEnabled = store.brushLockCardinalDirections
      if (lockEnabled) {
        // If we haven't locked an axis yet, track the movement from the moment Shift was held
        if (lockedAxis === LockedAxis.NONE) {
          lockOriginX ??= x
          lockOriginY ??= y

          const dx = Math.abs(x - lockOriginX)
          const dy = Math.abs(y - lockOriginY)

          if (dx > threshold || dy > threshold) {
            lockedAxis = dx > dy ? LockedAxis.HORIZONTAL : LockedAxis.VERTICAL
          } else {
            // Not moved enough to decide yet, so don't draw anything new
            return
          }
        }

        if (lockedAxis === LockedAxis.HORIZONTAL) {
          cy = lastDrawnY
        } else {
          cx = lastDrawnX
        }
      } else {
        // Reset lock state when Shift is released
        lockedAxis = LockedAxis.NONE
        lockOriginX = null
        lockOriginY = null
      }

      SCRATCH.x = cx
      SCRATCH.y = cy
      SCRATCH.lastDrawnX = lastDrawnX
      SCRATCH.lastDrawnY = lastDrawnY

      lastDrawnX = cx
      lastDrawnY = cy

      return SCRATCH
    },

    onDragEnd() {
      lastDrawnX = null
      lastDrawnY = null
      lockOriginX = null
      lockOriginY = null
      lockedAxis = LockedAxis.NONE
    },
  }
}