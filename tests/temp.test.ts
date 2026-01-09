import { describe, expectTypeOf, it } from 'vitest'
import {
  defineStepMeta,
  type EffectiveInputConstructors,
  type NodeDef,
  NodeType,
  type StepDataType,
} from '../src/lib/pipeline/_types'
import type { StepInputTypesToInstances } from '../src/lib/pipeline/Step'
import { useStepHandler } from '../src/lib/pipeline/useStepHandler'
import { BitMask } from '../src/lib/step-data-types/BitMask'
import { HeightMap } from '../src/lib/step-data-types/HeightMap'
import { NormalMap } from '../src/lib/step-data-types/NormalMap'
import { usePipelineStore } from '../src/lib/store/pipeline-store.ts'

describe('useStepHandler inputData inference', () => {
  const META = defineStepMeta({
    type: NodeType.STEP,
    def: 'test',
    displayName: 'Test',
    inputDataTypes: [HeightMap, BitMask],
    outputDataType: NormalMap,
  })

  type M = typeof META

  type InputCtors = EffectiveInputConstructors<M>

  expectTypeOf<InputCtors>().toExtend<
    readonly StepDataType[]
  >()

  expectTypeOf<InputCtors[number]>().toEqualTypeOf<
    typeof HeightMap | typeof BitMask
  >()

  type InputInstances = StepInputTypesToInstances<
    readonly [typeof HeightMap, typeof BitMask]
  >

  const store = usePipelineStore()
  const node = store.add(META.def as NodeDef, null)

  it('infers inputData inside run()', () => {
    useStepHandler(node.id, META, {
      config() {
        return { foo: 1 }
      },

      async run({ inputData }) {
        // ❗ This is the critical assertion
        // Today: inputData is inferred as NEVER
        // Expected: HeightMap | BitMask | null
        expectTypeOf(inputData).toEqualTypeOf<InputInstances | null>()

      },
    })
  })
})
