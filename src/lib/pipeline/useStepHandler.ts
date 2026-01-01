import { watch } from 'vue'
import type { StepDataType } from '../../steps.ts'
import { usePipelineStore } from '../store/pipeline-store.ts'
import { logStepWatch } from '../util/misc.ts'
import type { InitializedForkNode, InitializedNode, InitializedStepNode } from './Node.ts'
import { type AnyStepContext, type ReactiveConfigType, type StepContext } from './Step.ts'
import type { Config, StepHandlerOptions, StepHandlerOptionsInfer } from './StepHandler.ts'
import type { ForkStepRunner, NormalStepRunner, StepRunner } from './StepRunner.ts'

function useCoreStepHandler<
  T extends AnyStepContext,
  R extends StepRunner<T>
>(
  stepId: string,
  options: StepHandlerOptions<T, R>,
) {
  const store = usePipelineStore()

  const node = store.initializeNode<T>(stepId, options as StepHandlerOptions<T>)

  const watcherTargets = [
    node.config,
    () => node.seed,
    () => node.muted,
  ]

  watch(watcherTargets, () => {
    logStepWatch(node.id)
    store.markDirty(node.id)
  })

  return node as InitializedNode<T, R>
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
  options: StepHandlerOptionsInfer<
    C, SC, RC, I, O,
    NormalStepRunner<StepContext<C, SC, RC, I, O>>
  >,
) {
  type T = StepContext<C, SC, RC, I, O>
  type R = NormalStepRunner<T>

  return useCoreStepHandler<T, R>(stepId, options) as InitializedStepNode<T, R>
}

// ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
export function useForkHandler<
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
  type R = ForkStepRunner<T>

  return useCoreStepHandler<T, ForkStepRunner<T>>(stepId, options) as InitializedForkNode<T, R>
}