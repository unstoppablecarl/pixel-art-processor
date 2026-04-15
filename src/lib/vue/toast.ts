import {
  type BaseColorVariant,
  type ToastOrchestratorCreateParam,
  type ToastOrchestratorParam,
  useToast,
} from 'bootstrap-vue-next'
import { defineStore } from 'pinia'
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

// needs to be defined as a pinia store to allow calling toasts from other stores not sure why
export const toaster = defineStore('toaster', () => {

  const { create } = useToast()

  type Create = ToastOrchestratorParam & {
    progressVariant?: keyof BaseColorVariant,
  }

  function message({
                     title,
                     body = '',
                     bodyClass = null,
                     position = 'top-end',
                     modelValue = 10000,
                     variant = null,
                     textVariant = null,
                     progressVariant = 'info',
                   }: Create) {

    create({
      title,
      body,
      bodyClass,
      position,
      modelValue,
      variant,
      textVariant,
      progressProps: {
        variant: progressVariant,
      },
    })
  }

  function info(title: string, body: string = '') {
    message({
      title,
      body,
    })
  }

  function error(text: string, body: string = '') {
    message({
      bodyClass: 'toast-body-error',
      modelValue: true,
      title: text,
      body,
      textVariant: 'danger',
      progressVariant: 'danger',
    })
  }

  function validationError(text: string, body: string = '') {
    message({
      bodyClass: 'toast-body-error',
      modelValue: 20000,
      title: text,
      body,
      textVariant: 'danger',
      progressVariant: 'danger',
    })
  }

  return {
    message,
    info,
    error,
    validationError,
  }
})

