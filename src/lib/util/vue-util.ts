import { createPinia } from 'pinia'
import {
  createApp,
  h,
  isProxy,
  isReactive,
  isReadonly,
  isRef,
  render,
  toRaw,
  toValue,
  type UnwrapNestedRefs,
  type UnwrapRef,
} from 'vue'
import { STEP_DATA_TYPES, STEP_DEFINITIONS } from '../../steps.ts'
import { installStepRegistry, makeStepRegistry } from '../pipeline/StepRegistry.ts'
import { useStepStore } from '../store/step-store.ts'

export function deepUnwrap<T>(value: T, visited: Map<unknown, unknown> = new Map()): UnwrapNestedRefs<UnwrapRef<T>> {
  let rawValue: unknown = value
  if (isRef(value)) {
    rawValue = toValue(value)
  } else if (isProxy(value) && (isReactive(value) || isReadonly(value))) {
    rawValue = toRaw(value)
  }

  if (visited.has(rawValue)) {
    return visited.get(rawValue) as UnwrapNestedRefs<UnwrapRef<T>>
  }

  if (!isPlainObject(rawValue) && !Array.isArray(rawValue)) {
    return rawValue as UnwrapNestedRefs<UnwrapRef<T>>
  }

  const result: any = Array.isArray(rawValue) ? [] : {}

  visited.set(rawValue, result)

  if (Array.isArray(rawValue)) {
    rawValue.forEach((item, index) => {
      result[index] = deepUnwrap(item as any, visited)
    })
  } else {
    for (const key in rawValue) {
      if (Object.prototype.hasOwnProperty.call(rawValue, key)) {
        result[key] = deepUnwrap((rawValue as any)[key], visited)
      }
    }
  }

  return result as UnwrapNestedRefs<UnwrapRef<T>>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !isProxy(value) && !isRef(value)
}

export async function getStepComponentInputAndOutputTypes() {
  const app = createApp({ render: () => null })

  const pinia = createPinia()
  app.use(pinia)

  installStepRegistry(app, makeStepRegistry(STEP_DEFINITIONS, STEP_DATA_TYPES))

  const store = useStepStore(pinia)

  const vnodes = STEP_DEFINITIONS.map((stepDef) => {
    const step = store.add(stepDef.def)
    const vnode = h(stepDef.component, {
      stepId: step.id,
    })

    vnode.appContext = app._context
    return vnode
  })

  // Render all components as siblings
  const rootVnode = h('div', vnodes)
  rootVnode.appContext = app._context
  const container = document.createElement('div')
  render(rootVnode, container)

  await new Promise(resolve => setTimeout(resolve, 100))

  const result = Object.values(store.stepsById).map((step) => {
    return {
      input: step.handler!.inputDataTypes,
      output: step.handler!.outputDataType,
    }
  })

  render(null, container)
  store.$dispose()

  return result
}