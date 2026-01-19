import type { Position } from '../../pipeline/_types.ts'
import { resizeImageData, type RGBA } from './ImageData.ts'

export class ImageDataMutator {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private _imageData: ImageData | null = null

  constructor(imageData?: ImageData) {
    const canvas = document.createElement('canvas')
    if (!canvas) throw new Error('could not create html-dom')
    this.canvas = canvas

    const context = canvas.getContext('2d')
    if (!context) throw new Error('could not create context')
    this.ctx = context
    if (imageData) {
      this.set(imageData)
    }
  }

  drawOnto(target: CanvasRenderingContext2D, x = 0, y = 0) {
    if (!this._imageData) throw new Error('this.imageData not set')
    this.ctx.putImageData(this._imageData, 0, 0)

    target.drawImage(this.canvas, x, y)
  }

  putCtx(
    ctx: CanvasRenderingContext2D,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    targetX: number,
    targetY: number,
  ): void {
    if (!this._imageData) throw new Error('this.imageData not set')

    const sourceImageData = ctx.getImageData(sourceX, sourceY, sourceWidth, sourceHeight)
    this.putImageData(sourceImageData, targetX, targetY)
  }

  putImageData(
    imageData: ImageData,
    targetX: number,
    targetY: number,
  ): void {
    if (!this._imageData) throw new Error('this.imageData not set')

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const sourceIdx = (y * imageData.width + x) * 4
        const targetIdx = ((targetY + y) * this._imageData.width + (targetX + x)) * 4

        this._imageData.data[targetIdx] = imageData.data[sourceIdx]         // R
        this._imageData.data[targetIdx + 1] = imageData.data[sourceIdx + 1] // G
        this._imageData.data[targetIdx + 2] = imageData.data[sourceIdx + 2] // B
        this._imageData.data[targetIdx + 3] = imageData.data[sourceIdx + 3] // A
      }
    }
  }

  get imageData(): ImageData {
    if (!this._imageData) throw new Error('imageData not set')
    return this._imageData
  }

  set(imageData: ImageData) {
    this._imageData = imageData
    this.canvas.width = imageData.width
    this.canvas.height = imageData.height
    return this
  }

  clear() {
    if (!this._imageData) throw new Error('this.imageData not set')
    this._imageData.data.fill(0)
  }

  resize(width: number, height: number) {
    if (!this._imageData) throw new Error('this.imageData not set')
    this.set(resizeImageData(this._imageData, width, height))
  }

  setPixel(
    x: number,
    y: number,
    color: RGBA,
  ) {
    if (!this._imageData) throw new Error('this.imageData not set')
    const width = this._imageData.width
    const height = this._imageData.height

    if (x < 0 || y < 0 || x >= width || y >= height) return

    const index = (y * width + x) * 4
    const { r, g, b, a } = color
    this._imageData.data[index] = r
    this._imageData.data[index + 1] = g
    this._imageData.data[index + 2] = b
    this._imageData.data[index + 3] = a
  }

  drawPixelPerfectCircle(
    centerX: number,
    centerY: number,
    radius: number,
    fillColor: RGBA,
  ): void {

    const r = Math.floor(radius)
    const r2 = r * r

    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y < r2) {
          const px = Math.floor(centerX + x)
          const py = Math.floor(centerY + y)
          this.setPixel(px, py, fillColor)
        }
      }
    }
  }

  strokeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: RGBA,
  ): void {
    const x1 = x
    const y1 = y
    const x2 = x + width - 1
    const y2 = y + height - 1

    // Top + bottom edges
    for (let px = x1; px <= x2; px++) {
      this.setPixel(px, y1, fillColor)
      this.setPixel(px, y2, fillColor)
    }

    // Left + right edges
    for (let py = y1; py <= y2; py++) {
      this.setPixel(x1, py, fillColor)
      this.setPixel(x2, py, fillColor)
    }
  }
}

export const interpolateLine = (x0: number, y0: number, x1: number, y1: number): Position[] => {
  const points: Position[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  let x = x0
  let y = y0

  while (true) {
    points.push({ x, y })

    if (x === x1 && y === y1) break

    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return points
}