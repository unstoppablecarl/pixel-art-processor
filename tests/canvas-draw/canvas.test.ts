import { describe, it, expect } from 'vitest'

describe('canvas sanity', () => {
  it('creates a real canvas and draws pixels', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10

    const ctx = canvas.getContext('2d')!
    expect(ctx).toBeTruthy()

    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 1, 1)

    const data = ctx.getImageData(0, 0, 1, 1).data
    expect(data[0]).toBe(255) // R
    expect(data[1]).toBe(0)   // G
    expect(data[2]).toBe(0)   // B
    expect(data[3]).toBe(255) // A
  })
})
