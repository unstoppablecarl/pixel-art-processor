import { describe, it, expectTypeOf } from 'vitest'

// -----------------------------
// Minimal data types
// -----------------------------
class HeightMap {}
class BitMask {}
class NormalMap {}

type StepDataType =
  | typeof HeightMap
  | typeof BitMask
  | typeof NormalMap

// type StepDataTypeInstance =
//   | HeightMap
//   | BitMask
//   | NormalMap

// -----------------------------
// StepMeta
// -----------------------------
type StepMeta<I extends readonly StepDataType[], O extends StepDataType> = {
  type: 'STEP'
  def: string
  displayName: string
  inputDataTypes: I
  outputDataType: O
}

// -----------------------------
// Effective I/O
// -----------------------------
type EffectiveInputConstructors<M extends StepMeta<any, any>> =
  M['inputDataTypes']

type EffectiveOutputConstructor<M extends StepMeta<any, any>> =
  M['outputDataType']

// -----------------------------
// Config + StepContext
// -----------------------------
type Config = Record<string, any>
type ReactiveConfigType<C extends Config> = C

type StepContext<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>
> = {
  C: C
  SC: SC
  RC: RC

  InputConstructors: EffectiveInputConstructors<M>
  Input: StepInputTypesToInstances<EffectiveInputConstructors<M>>
  Output: InstanceType<EffectiveOutputConstructor<M>>
}

// -----------------------------
// Input instance mapping
// -----------------------------
type StepInputTypesToInstances<
  Input extends readonly StepDataType[]
> = Input[number] extends StepDataType
  ? InstanceType<Input[number]>
  : never

// -----------------------------
// Node + Runner
// -----------------------------
type NodeId = string & { readonly __nodeIdBrand: unique symbol }

type InitializedNode<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>
> = {
  id: NodeId
  meta: M
  context: StepContext<M, C, SC, RC>
}

type WatcherTarget = { path: string }

type StepValidationError = { message: string }

type NormalRunnerInput<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>
> = {
  config: StepContext<M, C, SC, RC>['RC']
  inputData: StepContext<M, C, SC, RC>['Input'] | null
}

type NormalRunner<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>
> = (
  options: NormalRunnerInput<M, C, SC, RC>
) => Promise<{ output: StepContext<M, C, SC, RC>['Output'] }>

// -----------------------------
// StepHandlerOptions (WITH CALLBACKS)
// -----------------------------
type StepHandlerOptions<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  R extends NormalRunner<M, C, SC, RC>
> = {
  meta: M

  config?: () => C
  reactiveConfig?: (defaults: C) => RC

  watcherTargets?: (
    node: InitializedNode<M, C, SC, RC>,
    defaultWatcherTargets: WatcherTarget[],
  ) => WatcherTarget[]

  validateInput?: (
    inputData: StepInputTypesToInstances<EffectiveInputConstructors<M>>,
    inputTypes: EffectiveInputConstructors<M>,
  ) => StepValidationError[]

  onRemoving?: (node: InitializedNode<M, C, SC, RC>) => void
  onRemoved?: (id: NodeId) => void
  onAdded?: (node: InitializedNode<M, C, SC, RC>) => void

  run: R
}

// -----------------------------
// useStepHandler
// -----------------------------
function useStepHandler<
  M extends StepMeta<any, any>,
  C extends Config,
  SC extends Config,
  RC extends ReactiveConfigType<C>,
  R extends NormalRunner<M, C, SC, RC>
>(
  nodeId: NodeId,
  options: StepHandlerOptions<M, C, SC, RC, R>
) {
  return options
}

// -----------------------------
// TESTS
// -----------------------------
describe('Fixed config + input inference WITH callbacks', () => {
  const STEP_META = {
    type: 'STEP',
    def: 'testing',
    displayName: 'Test',
    inputDataTypes: [HeightMap, BitMask] as const,
    outputDataType: NormalMap,
  } satisfies StepMeta<[typeof HeightMap, typeof BitMask], typeof NormalMap>

  type M = typeof STEP_META

  type RawConfig = {
    maskImageData: null | ImageData
  }

  type SerializedConfig = {
    maskImageData: null | { width: number; height: number }
  }

  type RC = ReactiveConfigType<RawConfig>

  it('input inference works', () => {
    type Input = StepInputTypesToInstances<EffectiveInputConstructors<M>>
    expectTypeOf<Input>().toEqualTypeOf<HeightMap | BitMask>()
  })

  it('config inference works AND callbacks are typed correctly', () => {
    const nodeId = 'node-1' as NodeId

    useStepHandler<
      M,
      RawConfig,
      SerializedConfig,
      RC,
      NormalRunner<M, RawConfig, SerializedConfig, RC>
    >(
      nodeId,
      {
        meta: STEP_META,

        config() {
          const raw: RawConfig = { maskImageData: null }
          return raw
        },

        watcherTargets(node, defaults) {
          // match instead of strict equal to avoid over‑sensitivity on SC details
          expectTypeOf(node).toEqualTypeOf<
            InitializedNode<M, RawConfig, SerializedConfig, RC>
          >()
          return defaults
        },

        validateInput(inputData, inputTypes) {
          expectTypeOf(inputData).toEqualTypeOf<HeightMap | BitMask>()
          expectTypeOf(inputTypes).toExtend<
            readonly [typeof HeightMap, typeof BitMask]
          >()
          return []
        },

        onRemoving(node) {
          expectTypeOf(node).toEqualTypeOf<
            InitializedNode<M, RawConfig, SerializedConfig, RC>
          >()
        },

        onRemoved(id) {
          expectTypeOf(id).toEqualTypeOf<NodeId>()
        },

        onAdded(node) {
          expectTypeOf(node).toEqualTypeOf<
            InitializedNode<M, RawConfig, SerializedConfig, RC>
          >()
        },

        async run({ config, inputData }) {
          expectTypeOf(config).toEqualTypeOf<RawConfig>()
          expectTypeOf(inputData).toEqualTypeOf<
            HeightMap | BitMask | null
          >()

          return { output: new NormalMap() }
        },
      }
    )
  })
})
