import { expectTypeOf } from 'expect-type'
import { watch } from 'vue'
import type { StepDataType } from '../../steps.ts'
import { useStepStore } from '../store/step-store.ts'
import { logStepWatch } from '../util/misc.ts'
import {
  type AnyStepContext,
  type ReactiveConfigType,
  type Step,
  type StepContext,
  type StepLoaderSerialized,
} from './Step.ts'
import type { Config, IStepHandler, StepHandlerOptionsInfer } from './StepHandler.ts'

export type ConfiguredStep<T extends AnyStepContext> =
  Required<Omit<Step<T>, 'config' | 'handler'>>
  & {
  config: NonNullable<Step<T>['config']>,
  handler: NonNullable<Step<T>['handler']>,
}

export type AnyConfiguredStep =
  Required<Omit<Step<AnyStepContext>, 'config' | 'handler'>>
  & {
  config: any,
  handler: any,
}

// ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
export function useStepHandler<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly StepDataType[],
  O extends StepDataType,
>(
  stepId: string,
  options: StepHandlerOptionsInfer<C, SC, RC, I, O>,
) {

  type T = StepContext<C, SC, RC, I, O>

  const store = useStepStore()
  const { step, handler } = store.registerStep<T>(stepId, options)

  expectTypeOf(handler).toExtend<IStepHandler<T>>()

  store.loadPendingInput(stepId)

  const process = () => {
    store.resolveStep<T>(stepId)
  }

  const defaultWatcherTargets = [
    step.config,
    () => step.inputData,
    () => step.seed,
    () => step.muted,
  ]

  const watcherTargets = handler.watcher(step as ConfiguredStep<T>, defaultWatcherTargets)

  watch(watcherTargets, () => {
    logStepWatch(step.id)
    process()
  }, { immediate: true })

  if (__DEV__) {
    const s = step as ConfiguredStep<T>
    expectTypeOf(s.loadSerialized).toExtend<StepLoaderSerialized<T['SerializedConfig']>>()
  }

  return step as ConfiguredStep<T>
}