import type { Point } from '../../node-data-types/BaseDataStructure.ts'
import type { BoundsLike } from '../data/Bounds.ts'

export class Sketch {
  readonly canvas: HTMLCanvasElement

  get width() {
    return this.canvas.width
  }

  get height() {
    return this.canvas.height
  }

  readonly ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement)
  constructor(width: number, height: number)
  constructor(width: number | HTMLCanvasElement, height?: number) {
    if (width instanceof HTMLCanvasElement) {
      this.canvas = width
    } else {
      const canvas = document.createElement('canvas')
      if (!canvas) throw new Error('cannot create canvas')
      canvas.width = width
      canvas.height = height ?? width

      this.canvas = canvas
    }

    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D
    if (!this.ctx) throw new Error('cannot create canvas context')
  }

  setSize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
  }

  fillRect(x: number, y: number, width: number, height: number, color: string) {
    this.ctx.save()
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, width, height)
    this.ctx.restore()
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  fillRectBounds(bounds: BoundsLike, color: string) {
    this.ctx.save()
    this.ctx.fillStyle = color
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    this.ctx.fillRect(bounds.minX, bounds.minY, width, height)
    this.ctx.restore()
  }

  putImageData(imageData: ImageData, x = 0, y = 0) {
    this.ctx.putImageData(imageData, x, y)
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

  toImageData(x = 0, y = 0, width = this.canvas.width, height = this.canvas.height) {
    return this.ctx.getImageData(x, y, width, height)
  }

  resize(
    newWidth: number,
    newHeight: number,
    offsetX = 0,
    offsetY = 0,
  ) {

    const canvas = this.canvas
    if (canvas.width === 0 || canvas.height === 0) {
      this.setSize(newWidth, newHeight)
      return
    }
    // 1. Copy old canvas into an offscreen canvas
    const oldWidth = canvas.width
    const oldHeight = canvas.height

    const off = document.createElement('canvas')
    off.width = oldWidth
    off.height = oldHeight
    const offCtx = off.getContext('2d')!
    offCtx.drawImage(canvas, 0, 0)

    // 2. Resize the real canvas (this clears it)
    canvas.width = newWidth
    canvas.height = newHeight

    // 3. Draw the old pixels back into the resized canvas
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(off, offsetX, offsetY)
  }

  toEncoded(): string {
    return this.canvas.toDataURL()
  }
}