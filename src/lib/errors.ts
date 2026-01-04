import type { Component } from 'vue'
import GenericValidationErrorMessage from '../components/ValidationErrors/GenericValidationErrorMessage.vue'
import InvalidInputTypeMessage from '../components/ValidationErrors/InvalidInputTypeMessage.vue'
import { InvalidInputTypeError } from './errors/InvalidInputTypeError.ts'
import { StepValidationError } from './errors/StepValidationError.ts'

type ErrorCtor = new (...args: any[]) => StepValidationError

const registry = new Map<ErrorCtor, Component>()

const map: { component: Component, error: ErrorCtor }[] = [{
  component: InvalidInputTypeMessage,
  error: InvalidInputTypeError,
}]

map.forEach(({ component, error }) => {
  registerValidationErrorComponent(error, component)
})

export function registerValidationErrorComponent(
  ctor: ErrorCtor,
  component: Component,
) {
  registry.set(ctor, component)
}

export function getValidationErrorComponent(
  error: StepValidationError,
): Component {
  return (
    registry.get(error.constructor as ErrorCtor) ??
    // fallback
    GenericValidationErrorMessage
  )
}

export function handleStepValidationError(error: Error): StepValidationError {
  if (error instanceof StepValidationError) {
    return error
  }

  throw error
}
