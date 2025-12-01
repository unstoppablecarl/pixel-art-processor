import { expectTypeOf } from 'expect-type'
import { toValue, watch } from 'vue'
import type { StepDataType, StepDataTypeInstance } from '../../steps.ts'
import { StepValidationError } from '../errors.ts'
import { useStepStore } from '../store/step-store.ts'
import type {
  AnyStepContext,
  ReactiveConfigType,
  Step,
  StepContext,
  StepInputTypesToInstances,
  StepLoaderSerialized,
  StepRef,
} from './Step.ts'
import type { Config, ConfigKeyAdapters, StepHandlerOptions, StepRunnerOptions } from './StepHandler.ts'

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

export function useStepHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  RC extends ReactiveConfigType<C>,
  C extends Config = RC extends ReactiveConfigType<infer U> ? U : never,
  SC extends Config = C,
  // A extends Record<string, ConfigKeyAdapter<any, any>> = Record<string, never>,
>(
  stepId: string,
  options: {
    inputDataTypes: I,
    outputDataType: O,
    config: () => RC,
    serializeConfig?: (config: C) => SC,
    deserializeConfig?: (config: SC) => C,
    run: StepRunnerOptions<C, RC, I, O>,
    watcher?: (step: StepRef<StepContext<C, SC, RC, I, O>>) => any,
    loadConfig?: (config: RC, serializedConfig: SC) => void,
    prevOutputToInput?: (outputData: StepDataTypeInstance | null) => StepInputTypesToInstances<I> | null,
    validateInputType?: (typeFromPrevOutput: StepDataType, inputDataTypes: I) => StepValidationError[],
    validateInput?: (inputData: StepInputTypesToInstances<I>) => StepValidationError[],
    configKeyAdapters?: ConfigKeyAdapters<C, SC>
  },
) {
  type T = StepContext<C, SC, RC, I, O>;

  console.log(`[${stepId}] useStepHandler`)

  if (__DEV__) {
    expectTypeOf(options.config).toExtend<StepHandlerOptions<T>['config']>()
    expectTypeOf(options.run).toExtend<StepHandlerOptions<T>['run']>()
    expectTypeOf(options.watcher).toExtend<StepHandlerOptions<T>['watcher']>()
    expectTypeOf(options.loadConfig).toExtend<StepHandlerOptions<T>['loadConfig']>()
    expectTypeOf(options.prevOutputToInput).toExtend<StepHandlerOptions<T>['prevOutputToInput']>()
    expectTypeOf(options.serializeConfig).toExtend<StepHandlerOptions<T>['serializeConfig']>()
    expectTypeOf(options.deserializeConfig).toExtend<StepHandlerOptions<T>['deserializeConfig']>()
    expectTypeOf(options.validateInputType).toExtend<StepHandlerOptions<T>['validateInputType']>()
    expectTypeOf(options.validateInput).toExtend<StepHandlerOptions<T>['validateInput']>()

    expectTypeOf(options).toExtend<StepHandlerOptions<T>>()
  }

  const store = useStepStore()
  const { step, handler } = store.registerStep<T>(stepId, options)

  // if input was handed off by an existing step before this step handler was loaded
  store.loadPendingInput(stepId)

  const process = () => {
    const inputData = toValue(step.inputData)

    store.resolveStep<T>(stepId, inputData, handler.run)
  }

  watch(
    handler.watcher(step as StepRef<T>),
    () => {
      console.log('[watch]', step.id)
      process()
    }, { immediate: true },
  )

  if (__DEV__) {
    const s = step as ConfiguredStep<T>

    expectTypeOf(s.id).toExtend<string>()
    expectTypeOf(s.def).toExtend<string>()
    // expectTypeOf(s.inputData).toExtend<T['Input']>()
    // expectTypeOf(s.outputData).toExtend<T['Output'] | null>()
    expectTypeOf(s.loadSerialized).toExtend<StepLoaderSerialized<T['SerializedConfig']>>()

    // expectTypeOf(s.config).toExtend<RC>()
  }

  return step as ConfiguredStep<T>
}

