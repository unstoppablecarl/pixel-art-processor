import { onMounted, onUnmounted } from 'vue'

export function useInterval(cb: () => void, intervalMs = 1000) {
  let intervalId: number | undefined

  onMounted(() => {
    intervalId = window.setInterval(cb, intervalMs)
  })

  onUnmounted(() => {
    if (intervalId !== undefined) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  })
}
