import { InvalidFileTypeError } from '../errors.ts'
import { imageToCanvas } from './ImageData.ts'

export async function getUploadedImageData(input: string | ArrayBuffer | File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const tempImg = new Image()
    tempImg.onload = () => {
      try {
        const { imageData } = imageToCanvas(tempImg)
        // Cleanup: Revoke if URL was created
        if (typeof input !== 'string' && 'revokeObjectURL' in URL) {
          URL.revokeObjectURL(tempImg.src)
        }
        resolve(imageData)
      } catch (error) {
        reject(new Error(`Failed to process image data: ${error}`))
      }
    }
    tempImg.onerror = () => {
      reject(new Error(`Failed to load image: Invalid format or URL`))
    }

    let src: string
    if (typeof input === 'string') {
      src = input
    } else if (input instanceof File) {
      src = URL.createObjectURL(input)  // File support added for completeness
    } else {
      // ArrayBuffer: Create Blob (as before, but with MIME type for safety)
      const blob = new Blob([input], { type: 'image/png' })  // Assume PNG; detect if needed
      src = URL.createObjectURL(blob)
    }

    tempImg.src = src
  })
}

export async function getFileAsArrayBuffer(e: Event): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const target = e.target as HTMLInputElement
    if (!target.files || target.files.length === 0) {
      reject(new Error('No file selected'))
      return
    }

    const selectedFile = target.files[0] as Blob
    const reader = new FileReader()

    reader.onload = (event) => {
      const result = event.target?.result
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error('Could not get file data as ArrayBuffer'))
      } else {
        resolve(result)
      }
    }

    reader.onerror = () => {
      reject(new Error('File read failed'))
    }

    reader.readAsArrayBuffer(selectedFile)
  })
}

export async function arrayBufferToDataUrl(arrayBuffer: ArrayBuffer, mimeType: string = 'image/png'): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([arrayBuffer], { type: mimeType })
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)  // data:image/png;base64,...
      } else {
        reject(new Error('Failed to read blob as data URL'))
      }
    }

    reader.onerror = () => reject(new Error('FileReader error during conversion'))

    reader.readAsDataURL(blob)
  })
}

export async function arrayBufferToImageData(arrayBuffer: ArrayBuffer, mimeType: string = 'image/png'): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([arrayBuffer], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const tempImg = new Image()

    tempImg.onload = () => {
      try {
        URL.revokeObjectURL(url)  // Cleanup memory
        const { imageData } = imageToCanvas(tempImg)
        resolve(imageData)
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(new Error(`Failed to extract ImageData: ${error}`))
      }
    }

    tempImg.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new InvalidFileTypeError())
    }

    tempImg.src = url
  })
}