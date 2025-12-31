import { expectTypeOf } from 'expect-type'
import { nextTick, watch } from 'vue'
import type { StepDataType } from '../../steps.ts'
import { useStepStore } from '../store/step-store.ts'
import { logStepWatch } from '../util/misc.ts'
import { type AnyStepContext, type InitializedStep, type ReactiveConfigType, type StepContext } from './Step.ts'
import type { Config, IStepHandler, StepHandlerOptions, StepHandlerOptionsInfer } from './StepHandler.ts'
import type { ForkStepRunner, NormalStepRunner, StepRunner } from './StepRunner.ts'

function useCoreStepHandler<
  T extends AnyStepContext,
  R extends StepRunner<T>
>(
  stepId: string,
  options: StepHandlerOptions<T, R>,
) {
  const store = useStepStore()
  const { step, watcherTargets } = store.registerStep<T>(stepId, options as StepHandlerOptions<T>)

  expectTypeOf(step.handler).toExtend<IStepHandler<T>>()

  watch(watcherTargets, () => {
    logStepWatch(step.id)
    store.resolveStep<T>(stepId)
  })

  nextTick(() => {
    store.resolveStep(stepId)
    step.initialized = true
    if (step.outputData === undefined) {
      throw new Error('wtf2')
    }
    // console.log('outputData = prev.outputData', prev.outputData)
    // console.log('prev', deepUnwrap(prev))
  })

  return step as InitializedStep<T, R>
}

// ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
export function useStepHandler<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly StepDataType[],
  O extends StepDataType
>(
  stepId: string,
  options: StepHandlerOptionsInfer<
    C, SC, RC, I, O,
    NormalStepRunner<StepContext<C, SC, RC, I, O>>
  >,
) {
  type T = StepContext<C, SC, RC, I, O>
  return useCoreStepHandler<T, NormalStepRunner<T>>(stepId, options)
}

// ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
export function useStepForkHandler<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly StepDataType[],
  O extends StepDataType
>(
  stepId: string,
  options: StepHandlerOptionsInfer<
    C, SC, RC, I, O,
    ForkStepRunner<StepContext<C, SC, RC, I, O>>
  >,
) {
  type T = StepContext<C, SC, RC, I, O>
  return useCoreStepHandler<T, ForkStepRunner<T>>(stepId, options)
}

export function useBranchHandler(forkId: string, branchIndex: number) {
  const store = useStepStore()

  const fork = store.getFork(forkId)
  const branch = store.getBranch(forkId, branchIndex)

  watch([
    () => fork.seed,
    () => branch.seed,
  ], () => {
    store.resolveBranch(forkId, branchIndex)
  })
}