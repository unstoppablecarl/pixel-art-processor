import { watch } from 'vue'
import { usePipelineStore } from '../store/pipeline-store.ts'
import { logNodeWatch } from '../util/misc.ts'
import type { AnyStepMeta, Config, NodeId, StepDataType, StepMeta } from './_types.ts'
import type { AnyNode, InitializedForkNode, InitializedNode, InitializedStepNode } from './Node.ts'
import type { ForkRunner, NormalRunner } from './NodeRunner.ts'
import { type AnyStepContext, type ReactiveConfigType, type StepContext } from './Step.ts'
import { type IStepHandler, makeStepHandler, type StepHandlerOptions } from './StepHandler.ts'

function useCoreStepHandler<
  M extends AnyStepMeta,
  T extends AnyStepContext,
>(
  nodeId: NodeId,
  handler: IStepHandler<M, T>,
) {
  const store = usePipelineStore()

  const node = store.get(nodeId) as AnyNode<M, T>
  node.initialize(handler)
  node.handler?.onAdded?.(node as InitializedNode<M, T>)

  node.getWatcherTargets()
    .forEach(({ name, target }) => {
      watch(target, () => {
        logNodeWatch(node.id, name)
        store.markDirty(node.id)
      }, { deep: true })
    })

  return node as InitializedNode<M, T>
}

// ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
export function useStepHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  M extends StepMeta<I, O>,
  R extends NormalRunner<StepContext<M, C, SC, RC>>
>(
  nodeId: NodeId,
  meta: M,
  handlerOptions: StepHandlerOptions<M, C, SC, RC, R>,
): InitializedStepNode<M, StepContext<M, C, SC, RC>> {
  const handler = makeStepHandler<M, C, SC, RC, R>(meta, handlerOptions)
  type T = StepContext<M, C, SC, RC>

  return useCoreStepHandler<M, T>(nodeId, handler) as InitializedStepNode<M, T>
}

export function useForkHandler<
  I extends readonly StepDataType[],
  O extends StepDataType,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  M extends StepMeta<I, O>,
  R extends ForkRunner<StepContext<M, C, SC, RC>>
>(
  nodeId: NodeId,
  meta: M,
  handlerOptions: StepHandlerOptions<M, C, SC, RC, R>,
)
  : InitializedForkNode<M, StepContext<M, C, SC, RC>> {
  const handler = makeStepHandler<M, C, SC, RC, R>(meta, handlerOptions)
  type T = StepContext<M, C, SC, RC>

  return useCoreStepHandler<M, T>(nodeId, handler) as InitializedForkNode<M, T>
}

//
// // ⚠️ options property order matters here see StepHandlerOptionsInfer⚠️
// export function useBranchHandler<
//   M extends AnyStepMeta,
//   C extends Config,
//   SC extends Config,
//   RC extends ReactiveConfigType<C>,
// >(
//   nodeId: NodeId,
//   meta: M,
//   handlerOptions: Optional<StepHandlerOptionsInfer<
//     C,
//     SC,
//     RC,
//     M['inputDataTypes'],
//     M['outputDataType'],
//     NormalRunner<StepContext<C, SC, RC, M['inputDataTypes'], M['outputDataType']>>
//   >, 'run'>,
// ) {
//
//   type T = StepContext<
//     C,
//     SC,
//     RC,
//     M['inputDataTypes'],
//     M['outputDataType']
//   >
//
//   const merged = {
//     async run({ inputData, meta, inputPreview }) {
//       return {
//         output: inputData,
//         preview: inputPreview,
//         meta,
//       }
//     },
//     ...handlerOptions,
//   } as StepHandlerOptions<M, T, NormalRunner<T>>
//
//   type R = NormalRunner<T>
//
//   const handler = makeStepHandler<M, T, R>(meta, merged)
//
//   return useCoreStepHandler<M, T, R>(nodeId, meta, handler) as InitializedBranchNode<M, T>
// }