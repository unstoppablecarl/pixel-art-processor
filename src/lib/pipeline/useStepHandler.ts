import { watch, type WatchSource } from 'vue'
import type { StepDataType } from '../../steps'
import { useStepStore } from '../store/step-store'
import { logStepWatch } from '../util/misc'
import {
  type AnyStepContext,
  type ConfiguredForkStep,
  type ConfiguredNormalStep,
  type ReactiveConfigType,
  type StepContext,
} from './Step'
import type { Config, ForkStepRunner, StepHandlerOptions, StepRunner } from './StepHandler'
import { useStepRegistry } from './StepRegistry'

/* -------------------------------------------------------------------------------------------------
 * Core setup shared by normal + fork handlers
 * ------------------------------------------------------------------------------------------------- */

function setupStepHandlerCore<
  T extends AnyStepContext,
  Runner extends StepRunner<T> | ForkStepRunner<T> = StepRunner<T>,
>(
  stepId: string,
  options: StepHandlerOptions<T, Runner>,
) {
  const store = useStepStore()
  const { step, handler } = store.registerStep<T, Runner>(stepId, options)

  store.loadPendingInput(stepId)

  const process = () => store.resolveStep<T>(stepId)

  const defaultWatcherTargets: WatchSource[] = [
    step.config,
    () => step.inputData,
    () => step.seed,
    () => step.muted,
  ]

  const watcherTargets =
    handler.watcher?.(step as any, defaultWatcherTargets) ??
    defaultWatcherTargets

  watch(
    watcherTargets,
    () => {
      logStepWatch(step.id)
      process()
    },
    { immediate: true },
  )

  return step as typeof step & { handler: typeof handler }
}

/* -------------------------------------------------------------------------------------------------
 * Normal step handler
 * ------------------------------------------------------------------------------------------------- */

export function useStepHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  RC extends ReactiveConfigType<C>,
  C extends Config = RC extends ReactiveConfigType<infer U> ? U : Record<string, any>,
  SC extends Config = C,
>(
  stepId: string,
  options: StepHandlerOptions<
    StepContext<C, SC, RC, I, O>,
    StepRunner<StepContext<C, SC, RC, I, O>>
  >,
) {
  type T = StepContext<C, SC, RC, I, O>

  const step = setupStepHandlerCore<
    T,
    StepRunner<T>
  >(stepId, options)

  return step as ConfiguredNormalStep<T>
}

/* -------------------------------------------------------------------------------------------------
 * Fork step handler
 * ------------------------------------------------------------------------------------------------- */

export function useForkStepHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  RC extends ReactiveConfigType<C>,
  C extends Config = RC extends ReactiveConfigType<infer U> ? U : Record<string, any>,
  SC extends Config = C,
>(
  stepId: string,
  options: StepHandlerOptions<
    StepContext<C, SC, RC, I, O>,
    ForkStepRunner<StepContext<C, SC, RC, I, O>>
  >,
) {
  type T = StepContext<C, SC, RC, I, O>

  const store = useStepStore()
  const def = store.get(stepId).def
  useStepRegistry().validateDefIsFork(def)

  const step = setupStepHandlerCore<
    T,
    ForkStepRunner<T>
  >(stepId, options)

  return step as ConfiguredForkStep<T>
}
