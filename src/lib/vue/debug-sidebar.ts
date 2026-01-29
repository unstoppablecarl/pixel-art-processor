import { ref, shallowRef } from 'vue'
import { getCanvasPixelContext } from '../util/html-dom/PixelCanvas.ts'

const data = ref<Record<string, any>>({})
const canvas = shallowRef<HTMLCanvasElement | null>(null)

export function useDebugSidebar() {
  return {
    data,
    canvas,
    clearData() {
      data.value = {}
    },
    get ctx() {
      return getCanvasPixelContext(canvas.value!)
    },
    resize(w: number, h: number) {
      canvas.value!.width = w
      canvas.value!.height = h
    },
    setCanvas(el: HTMLCanvasElement) {
      canvas.value = el
    },
  }
}