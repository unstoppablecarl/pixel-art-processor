import type { Point, PointValueFilter } from '../../step-data-types/BaseDataStructure.ts'
import type { Bit, BitMask } from '../../step-data-types/BitMask.ts'

export function smoothAutomata(
  mask: BitMask,
  iterations: number = 1,
  pointFilter?: PointValueFilter<Bit>,
): void {
  for (let iter = 0; iter < iterations; iter++) {
    _smoothAutomata(mask, pointFilter)
  }
}

function _smoothAutomata(
  mask: BitMask,
  pointFilter?: PointValueFilter<Bit>,
): void {

  const willAdd: Point[] = []
  const willRemove: Point[] = []

  mask.each((x, y, v) => {
    if (pointFilter !== undefined && !pointFilter(x, y, v)) return

    if (v === 1) {
      let count = 0
      // If a cell is alive (Land) but has < 4 alive neighbors, it dies (becomes Water).
      const stayAlive = mask.hasAdjacent(x, y, (_x, _y, v) => {
        if (v == 1) count++
        return count === 4
      })

      if (!stayAlive) {
        willRemove.push({ x, y })
      }
    }

    let count = 0
    // If a cell is dead (Water) but has > 5 alive neighbors, it becomes alive (Land).
    const becomeAlive = mask.hasAdjacent(x, y, (_x, _y, v) => {
      if (v == 1) count++
      return count === 6
    })

    if (becomeAlive) {
      willAdd.push({ x, y })
    }

    willAdd.forEach(({ x, y }) => mask.set(x, y, 1))
    willRemove.forEach(({ x, y }) => mask.set(x, y, 0))

  })
}