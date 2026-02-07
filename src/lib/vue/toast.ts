import { type ToastOrchestratorCreateParam, useToast } from 'bootstrap-vue-next'
import { toValue } from 'vue'

export function useDebouncedToast() {
  const toast = useToast()
  const activeToasts = new Set<string>()

  function show(options: ToastOrchestratorCreateParam) {
    const opts = toValue(options)
    const toastId = opts.id || `${opts.title + ''}-${opts.body + ''}-${opts.variant + ''}`

    if (activeToasts.has(toastId)) {
      return
    }

    activeToasts.add(toastId)

    const originalOnHidden = opts.onHidden

    toast.create({
      ...opts,
      onHidden: (e) => {
        activeToasts.delete(toastId)
        originalOnHidden?.(e)
      },
    })
  }

  return show
}