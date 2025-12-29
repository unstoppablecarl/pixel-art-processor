import { expectTypeOf } from 'expect-type'
import { shallowReactive, type ShallowReactive, toValue, watch } from 'vue'
import type { StepDataType } from '../../steps.ts'
import type { StepValidationError } from '../errors.ts'
import { BitMask } from '../step-data-types/BitMask.ts'
import { HeightMap } from '../step-data-types/HeightMap.ts'
import { NormalMap } from '../step-data-types/NormalMap.ts'
import { useStepStore } from '../store/step-store.ts'
import { deserializeImageData, type SerializedImageData, serializeImageData } from '../util/ImageData.ts'
import { logStepWatch } from '../util/misc.ts'
import {
  type AnyStepContext,
  type ReactiveConfigType,
  type Step,
  type StepContext,
  type StepLoaderSerialized,
} from './Step.ts'
import type {
  Config,
  IStepHandler,
  StepHandlerOptionsInfer,
  StepRunner,
  StepRunnerOutputMaybePromise,
  WatcherTarget,
} from './StepHandler.ts'

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
  // const { step, handler } = store.registerStep<T>(stepId, options as StepHandlerOptions<T>)

  expectTypeOf(handler).toExtend<IStepHandler<T>>()

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
  // return step as ConfiguredStep<StepContext<C, SC, RC, I, O>>
}

function tester() {

  const inputDataTypes = [HeightMap, BitMask] as const
  const outputDataType = NormalMap

  type InputInstances = HeightMap | BitMask
  type OutputInstance = NormalMap

  const configRaw = {
    maskImageData: null as ImageData | null,
  }

  type C = typeof configRaw
  type SC = { maskImageData: SerializedImageData | null }
  type RC = ShallowReactive<C>
  type I = typeof inputDataTypes
  type O = typeof outputDataType

  const step = useStepHandler('testing', {
    inputDataTypes,
    outputDataType,

    config() {
      return {
        ...configRaw,
      }
    },

    reactiveConfig(defaults) {
      expectTypeOf(defaults).toEqualTypeOf<C>()

      return shallowReactive(defaults) as RC
    },

    serializeConfig(config) {
      expectTypeOf(config).toEqualTypeOf<C>()
      return {
        ...config,
        maskImageData: serializeImageData(config.maskImageData),
      } as SC
    },

    deserializeConfig(config) {
      expectTypeOf(config).toEqualTypeOf<SC>()
      return {
        ...config,
        maskImageData: deserializeImageData(config.maskImageData),
      } as C
    },

    watcher(step) {
      expectTypeOf(step).toExtend<ConfiguredStep<T>>()
      expectTypeOf(step.config).toExtend<ConfiguredStep<T>['config']>()

      return [] as WatcherTarget[]
    },
    loadConfig(config, serialized) {
      expectTypeOf(config).toExtend<RC>()
      expectTypeOf(serialized).toExtend<SC>()
    },
    prevOutputToInput(output) {
      expectTypeOf(output).toEqualTypeOf<InputInstances | null>()

      return output as InputInstances | null
    },
    validateInputType() {
      return [] as StepValidationError[]
    },
    validateInput(inputData) {
      expectTypeOf(inputData).toEqualTypeOf<InputInstances>()

      return [] as StepValidationError[]
    },
    run({ config, inputData }) {
      expectTypeOf(config).toEqualTypeOf<RC>()
      expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()

      return { output: new NormalMap(10, 10) }
    },
  })

  type T = typeof step extends ConfiguredStep<infer U> ? U : never

  expectTypeOf<T>().toEqualTypeOf<StepContext<C, SC, RC, I, O>>()
  expectTypeOf(step).not.toEqualTypeOf<ConfiguredStep<AnyStepContext>>()
  expectTypeOf(step).toExtend<ConfiguredStep<StepContext<C, SC, RC, I, O>>>()

  expectTypeOf(step.handler.run).toEqualTypeOf<
    IStepHandler<T>['run']
  >()
  expectTypeOf(step.handler.run).toEqualTypeOf<
    StepRunner<T>
  >()
  expectTypeOf(step.handler.run).toEqualTypeOf<
    ({ config, inputData }: {
      config: RC,
      inputData: InputInstances | null
    }) => StepRunnerOutputMaybePromise<OutputInstance>
  >()
  expectTypeOf(step.handler.run).parameters.toEqualTypeOf<[
    { config: RC, inputData: InputInstances | null }
  ]>()
  expectTypeOf(step.handler.run).returns.toEqualTypeOf<
    StepRunnerOutputMaybePromise<OutputInstance>
  >()

  expectTypeOf(step.handler.config).toEqualTypeOf<
    IStepHandler<T>['config']
  >()
  expectTypeOf(step.handler.config).toEqualTypeOf<
    () => C
  >()

  expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
    IStepHandler<T>['reactiveConfig']
  >()
  expectTypeOf(step.handler.reactiveConfig).toEqualTypeOf<
    (defaults: C) => RC
  >()

  expectTypeOf(step.handler.watcher).toEqualTypeOf<
    IStepHandler<T>['watcher']
  >()
  expectTypeOf(step.handler.watcher).toEqualTypeOf<
    (step: ConfiguredStep<T>, defaultWatcherTargets: WatcherTarget[]) => WatcherTarget[]
  >()

  expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
    IStepHandler<T>['serializeConfig']
  >()
  expectTypeOf(step.handler.serializeConfig).toEqualTypeOf<
    ((config: C) => SC)
  >()

  expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
    IStepHandler<T>['deserializeConfig']
  >()
  expectTypeOf(step.handler.deserializeConfig).toEqualTypeOf<
    ((config: SC) => C)
  >()

  expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
    IStepHandler<T>['loadConfig']
  >()
  expectTypeOf(step.handler.loadConfig).toEqualTypeOf<
    (config: RC, serializedConfig: SC) => void
  >()

  expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<
    IStepHandler<T>['prevOutputToInput']
  >()
  expectTypeOf(step.handler.prevOutputToInput).toEqualTypeOf<
    ((output: InputInstances | null) => InputInstances | null)
  >()

  expectTypeOf(step.handler.validateInputType).toEqualTypeOf<
    IStepHandler<T>['validateInputType']
  >()
  expectTypeOf(step.handler.validateInputType).toEqualTypeOf<
    ((typeFromPrevOutput: InputInstances, inputDataTypes: T['InputConstructors']) => StepValidationError[])
  >()

  expectTypeOf(step.handler.validateInput).toEqualTypeOf<
    IStepHandler<T>['validateInput']
  >()
  expectTypeOf(step.handler.validateInput).toEqualTypeOf<
    (inputData: InputInstances) => StepValidationError[]
  >()
}

tester()