import type { BoundsLike } from '../data/Bounds.ts'
import type { Point } from '../step-data-types/BaseDataStructure.ts'

export class Sketch {
  readonly canvas: HTMLCanvasElement

  get width() {
    return this.canvas.width
  }

  get height() {
    return this.canvas.height
  }

  readonly ctx: CanvasRenderingContext2D

  constructor(width: number, height?: number) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height ?? width

    this.canvas = canvas
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  }

  fillRectBounds(bounds: BoundsLike, color: string) {
    this.ctx.save()
    this.ctx.fillStyle = color
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    this.ctx.fillRect(bounds.minX, bounds.minY, width, height)
    this.ctx.restore()
  }

  putImageData(imageData: ImageData) {
    this.ctx.putImageData(imageData, 0, 0)
  }

  setPixels(points: Point[], color: string) {
    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i]
      this.setPixel(x, y, color)
    }
  }

  setPixel(x: number, y: number, color: string) {
    this.ctx.save()
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, 1, 1)
    this.ctx.restore()
  }

  toImageData() {
    return this.ctx.getImageData(0, 0, this.width, this.height)
  }

  toEncoded(): string {
    return this.canvas.toDataURL()
  }
}