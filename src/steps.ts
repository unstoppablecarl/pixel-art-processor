import HeightMapGlow from './components/Step/HeightMapGlow.vue'
import HeightMapNoise from './components/Step/HeightMapNoise.vue'
import HeightMapToNormalMap from './components/Step/HeightMapToNormalMap.vue'
import Mask from './components/Step/Mask.vue'
import NormalLighting from './components/Step/NormalLighting.vue'
import type { StepDefinition } from './lib/pipeline/StepRegistry.ts'
import { BaseDataStructure } from './lib/step-data-types/BaseDataStructure.ts'
import { BitMask } from './lib/step-data-types/BitMask.ts'
import { HeightMap } from './lib/step-data-types/HeightMap.ts'
import { NormalMap } from './lib/step-data-types/NormalMap.ts'

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    def: 'INPUT_MASK',
    component: Mask,
    displayName: 'Input Mask Image',
  },
  {
    def: 'INNER_GLOW',
    component: HeightMapGlow,
    displayName: 'Inner Glow',
  },
  {
    def: 'SIMPLEX_NOISE',
    component: HeightMapNoise,
    displayName: 'Add Noise',
  },
  {
    def: 'height_map_to_normal_map',
    component: HeightMapToNormalMap,
    displayName: 'Height Map -> Normal Map',
  },
  {
    def: 'normal_map_to_lighting',
    displayName: 'Normal Map -> Texture Lighting',
    component: NormalLighting,
  },
]

export const STEP_DATA_TYPES: ValidStepDataTypeConstructors[] = [
  BitMask as typeof BaseDataStructure,
  NormalMap as typeof ImageData,
  HeightMap as typeof BaseDataStructure,
  ImageData,
]

export type ValidStepDataTypeConstructors = typeof BaseDataStructure | typeof ImageData

export type StepDataTypeInstance = InstanceType<StepDataType>;

export type StepDataType =
  | typeof BitMask
  | typeof NormalMap
  | typeof HeightMap
  | typeof ImageData;

export type GetStepDataTypeInstances<I extends readonly StepDataType[]> = InstanceType<I[number]>