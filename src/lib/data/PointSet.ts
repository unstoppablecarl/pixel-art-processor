import type { Point } from '../step-data-types/BaseDataStructure.ts'

export class PointSet extends Map<string, Point> {
  add(x: number, y: number) {
    const key = x + ',' + y
    if (this.has(key)) return

    this.set(key, { x, y })
  }

  addMultiple(points: Point[]) {
    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i] as Point
      this.add(x, y)
    }
  }

  contains(x: number, y: number) {
    return this.has(x + ',' + y)
  }

  toArray() {
    return [...this.values()]
  }
}

