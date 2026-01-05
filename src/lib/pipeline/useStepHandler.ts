import { watch } from 'vue'
import { usePipelineStore } from '../store/pipeline-store.ts'
import { logNodeWatch } from '../util/misc.ts'
import type { Config, NodeId, StepDataType } from './_types.ts'
import type { InitializedForkNode, InitializedNode, InitializedStepNode } from './Node.ts'
import type { ForkStepRunner, NodeRunner, NormalStepRunner } from './NodeRunner.ts'
import { type AnyStepContext, type ReactiveConfigType, type StepContext } from './Step.ts'
import type { StepHandlerOptions, StepHandlerOptionsInfer } from './StepHandler.ts'

function useCoreStepHandler<
  T extends AnyStepContext,
  R extends NodeRunner<T>
>(
  nodeId: NodeId,
  options: StepHandlerOptions<T, R>,
) {
  const store = usePipelineStore()

  const node = store.initializeNode<T>(nodeId, options as StepHandlerOptions<T>)

  watch(node.getWatcherTargets(), () => {
    logNodeWatch(node.id)
    store.markDirty(node.id)
  }, { deep: true })

  return node as InitializedNode<T>
}

// ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
export function useStepHandler<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly StepDataType[],
  O extends StepDataType,
>(
  nodeId: NodeId,
  options: StepHandlerOptionsInfer<
    C, SC, RC, I, O,
    NormalStepRunner<StepContext<C, SC, RC, I, O>>
  >,
) {
  type T = StepContext<C, SC, RC, I, O>
  type R = NormalStepRunner<T>

  return useCoreStepHandler<T, R>(nodeId, options) as InitializedStepNode<T>
}

// ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
export function useForkHandler<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly StepDataType[],
  O extends StepDataType
>(
  nodeId: NodeId,
  options: StepHandlerOptionsInfer<
    C, SC, RC, I, O,
    ForkStepRunner<StepContext<C, SC, RC, I, O>>
  >,
) {
  type T = StepContext<C, SC, RC, I, O>

  return useCoreStepHandler<T, ForkStepRunner<T>>(nodeId, options) as InitializedForkNode<T>
}