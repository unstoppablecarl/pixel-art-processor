// @ts-nocheck

// Patch global Image, ImageData
import { createCanvas, Image, ImageData } from '@napi-rs/canvas'

global.Image = Image
global.ImageData = ImageData

// Patch window.Image + window.ImageData (JSDOM keeps its own window object)
if (typeof window !== 'undefined') {
  window.Image = Image
  window.ImageData = ImageData
}

// Create a wrapper that behaves like a DOM canvas but delegates to napi-canvas
class PatchedCanvas {
  constructor() {
    this._canvas = createCanvas(300, 150)
    this.width = 300
    this.height = 150
  }

  getContext(type) {
    return this._canvas.getContext(type)
  }

  // JSDOM sometimes inspects these
  get width() {
    return this._canvas.width
  }

  set width(v) {
    this._canvas.width = v
  }

  get height() {
    return this._canvas.height
  }

  set height(v) {
    this._canvas.height = v
  }

  toDataURL(...args) {
    return this._canvas.toDataURL(...args)
  }
}

// Override BOTH global and window constructors
global.HTMLCanvasElement = PatchedCanvas
if (typeof window !== 'undefined') {
  window.HTMLCanvasElement = PatchedCanvas
}

// Override document.createElement('canvas')
const origCreateElement = document.createElement.bind(document)
document.createElement = (tag) => {
  if (tag === 'canvas') {
    return new PatchedCanvas()
  }
  return origCreateElement(tag)
}
