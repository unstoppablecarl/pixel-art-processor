import { expectTypeOf } from 'expect-type'
import { toValue, watch, type WatchSource } from 'vue'
import type { StepDataType } from '../../steps.ts'
import { StepValidationError } from '../errors.ts'
import { useStepStore } from '../store/step-store.ts'
import { logStepWatch } from '../util/misc.ts'
import {
  type AnyStepContext,
  type ForkStep,
  type NormalStep,
  type ReactiveConfigType,
  type Step,
  type StepContext,
  type StepInputTypesToInstances,
  type StepLoaderSerialized,
} from './Step.ts'
import type { Config, ConfigKeyAdapters, ForkStepRunner, StepHandlerOptions, StepRunner } from './StepHandler.ts'
import { useStepRegistry } from './StepRegistry.ts'

export type ConfiguredStep<T extends StepContext> =
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

// Shared options type - just the structure without the run method
type BaseOptions<
  I extends readonly StepDataType[],
  O extends StepDataType,
  RC extends ReactiveConfigType<C>,
  C extends Config,
  SC extends Config
> = {
  readonly inputDataTypes: I,
  readonly outputDataType: O,
  config: () => RC,
  serializeConfig?: (config: C) => SC,
  deserializeConfig?: (config: SC) => C,
  watcher?: (step: ConfiguredStep<StepContext<C, SC, RC, I, O>>, defaultWatcherTargets: WatchSource[]) => WatchSource[],
  loadConfig?: (config: RC, serializedConfig: SC) => void,
  prevOutputToInput?: (outputData: StepInputTypesToInstances<I> | null) => StepInputTypesToInstances<I> | null,
  validateInputType?: (typeFromPrevOutput: StepDataType, inputDataTypes: I) => StepValidationError[],
  validateInput?: (inputData: StepInputTypesToInstances<I>) => StepValidationError[],
  configKeyAdapters?: ConfigKeyAdapters<C, SC>
}

// Core setup function
function setupStepHandlerCore<
  I extends readonly StepDataType[],
  O extends StepDataType,
  RC extends ReactiveConfigType<C>,
  C extends Config = RC extends ReactiveConfigType<infer U> ? U : never,
  SC extends Config = C,
  Runner extends (args: any) => any = (args: any) => any,
>(
  stepId: string,
  options: BaseOptions<I, O, RC, C, SC> & { run: Runner },
) {
  type T = StepContext<C, SC, RC, I, O>;

  if (__DEV__) {
    expectTypeOf(options).toExtend<StepHandlerOptions<T, Runner>>()
    expectTypeOf(options.config).toExtend<StepHandlerOptions<T>['config']>()
    expectTypeOf(options.watcher).toExtend<StepHandlerOptions<T>['watcher']>()
    expectTypeOf(options.loadConfig).toExtend<StepHandlerOptions<T>['loadConfig']>()
    expectTypeOf(options.prevOutputToInput).toExtend<StepHandlerOptions<T>['prevOutputToInput']>()
    expectTypeOf(options.serializeConfig).toExtend<StepHandlerOptions<T>['serializeConfig']>()
    expectTypeOf(options.deserializeConfig).toExtend<StepHandlerOptions<T>['deserializeConfig']>()
    expectTypeOf(options.validateInputType).toExtend<StepHandlerOptions<T>['validateInputType']>()
    expectTypeOf(options.validateInput).toExtend<StepHandlerOptions<T>['validateInput']>()
    expectTypeOf(options).toExtend<StepHandlerOptions<T, Runner>>()
  }

  const store = useStepStore()
  const { step, handler } = store.registerStep<T>(stepId, options as StepHandlerOptions<T, Runner>)

  store.loadPendingInput(stepId)

  const process = () => {
    const inputData = toValue(step.inputData)
    store.resolveStep<T>(stepId, inputData)
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

export function useStepHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  RC extends ReactiveConfigType<C>,
  C extends Config = RC extends ReactiveConfigType<infer U> ? U : never,
  SC extends Config = C,
>(
  stepId: string,
  options: BaseOptions<I, O, RC, C, SC> & {
    run: StepRunner<StepContext<C, SC, RC, I, O>>
  },
) {
  type T = StepContext<C, SC, RC, I, O>
  const step = setupStepHandlerCore<I, O, RC, C, SC, StepRunner<T>>(stepId, options)
  return step as ConfiguredStep<T> & NormalStep<T>
}

export function useForkStepHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  RC extends ReactiveConfigType<C>,
  C extends Config = RC extends ReactiveConfigType<infer U> ? U : never,
  SC extends Config = C,
>(
  stepId: string,
  options: BaseOptions<I, O, RC, C, SC> & {
    run: ForkStepRunner<StepContext<C, SC, RC, I, O>>
  },
) {
  type T = StepContext<C, SC, RC, I, O>

  const store = useStepStore()
  const def = store.get(stepId).def
  useStepRegistry().validateDefIsFork(def)

  const step = setupStepHandlerCore<I, O, RC, C, SC, ForkStepRunner<T>>(stepId, options)
  return step as ConfiguredStep<T> & ForkStep<T>
}