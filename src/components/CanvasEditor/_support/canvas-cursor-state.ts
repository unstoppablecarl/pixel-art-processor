import { ref } from 'vue'

export const hoveredCanvasId = ref<string | null>(null)
export const currentCursorClass = ref<string | null>(null)

export function setHoveredCanvas(id: string | null) {
  hoveredCanvasId.value = id
}

export function setCursorClass(cls: string | null) {
  currentCursorClass.value = cls
}
