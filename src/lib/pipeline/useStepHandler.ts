import { watch } from 'vue'
import type { Optional } from '../_helpers.ts'
import { type PipelineStore, usePipelineStore } from '../store/pipeline-store.ts'
import { logNodeWatch } from '../util/misc.ts'
import type { Config, NodeId, StepDataType } from './_types.ts'
import {
  type AnyNode,
  BranchNode,
  ForkNode,
  type InitializedBranchNode,
  type InitializedForkNode,
  type InitializedStepNode,
  StepNode,
} from './Node.ts'
import type { ForkStepRunner, NormalStepRunner } from './NodeRunner.ts'
import { type ReactiveConfigType, type StepContext } from './Step.ts'
import { type StepHandlerOptions, type StepHandlerOptionsInfer } from './StepHandler.ts'

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

  const store = usePipelineStore()
  const node = store.get(nodeId) as unknown as StepNode<T>
  node.initializeStep(options)
  createWatchers(store, node)

  return node as InitializedStepNode<T>
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

  const store = usePipelineStore()
  const node = store.get(nodeId) as unknown as ForkNode<T>
  node.initializeFork(options)
  createWatchers(store, node)

  return node as InitializedForkNode<T>
}

// ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
export function useBranchHandler<
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  I extends readonly StepDataType[],
  O extends StepDataType
>(
  nodeId: NodeId,
  options: Optional<
    StepHandlerOptionsInfer<
      C, SC, RC, I, O,
      NormalStepRunner<StepContext<C, SC, RC, I, O>>
    >,
    'run'
  >,
) {
  type T = StepContext<C, SC, RC, I, O>

  const merged = {
    async run({ inputData, meta }) {
      return {
        output: inputData,
        meta,
      }
    },
    ...options,
  } as StepHandlerOptions<T, NormalStepRunner<T>>

  const store = usePipelineStore()
  const node = store.get(nodeId) as unknown as BranchNode<T>
  node.initializeBranch(merged)
  createWatchers(store, node)

  return node as InitializedBranchNode<T>
}

function createWatchers(store: PipelineStore, node: AnyNode) {
  node.getWatcherTargets()
    .forEach(({ name, target }) => {
      watch(target, () => {
        logNodeWatch(node.id, name)
        store.markDirty(node.id)
      }, { deep: true })
    })
}