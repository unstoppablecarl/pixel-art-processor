import { makeReusablePixelCanvas } from './PixelCanvas.ts'

export function writePngBlobToClipboard(blob: Blob) {
  const item = new ClipboardItem({ 'image/png': blob })
  navigator.clipboard.write([item])
}

const getImageDataFromClipboard_pixelCanvas = makeReusablePixelCanvas()

export async function getImageDataFromClipboard(clipboardEvent: ClipboardEvent) {
  const items = clipboardEvent?.clipboardData?.items
  if (!items?.length) return null

  // Look for image items in the clipboard
  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile()

      if (!blob) {
        continue
      }

      // Create an image from the blob
      const img = new Image()
      const url = URL.createObjectURL(blob)

      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })

      const { canvas, ctx } = getImageDataFromClipboard_pixelCanvas(img.width, img.height)

      // Draw image and get ImageData
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Clean up
      URL.revokeObjectURL(url)

      return imageData
    }
  }
}