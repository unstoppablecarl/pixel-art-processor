import BitMaskIslandEdges from './components/Step/BitMaskIslandEdges.vue'
import BitMaskIslandsAdd from './components/Step/BitMaskIslandsAdd.vue'
import BitMaskIslandsGrow from './components/Step/BitMaskIslandsGrow.vue'
import HeightMapGlow from './components/Step/HeightMapGlow.vue'
import HeightMapNoise from './components/Step/HeightMapNoise.vue'
import HeightMapToNormalMap from './components/Step/HeightMapToNormalMap.vue'
import Mask from './components/Step/Mask.vue'
import NormalMapToImageLighting from './components/Step/NormalMapToImageLighting.vue'
import type { StepDefinition } from './lib/pipeline/StepRegistry.ts'
import { BaseDataStructure } from './lib/step-data-types/BaseDataStructure.ts'
import { BitMask } from './lib/step-data-types/BitMask.ts'
import { HeightMap } from './lib/step-data-types/HeightMap.ts'
import { NormalMap } from './lib/step-data-types/NormalMap.ts'
import { PixelMap } from './lib/step-data-types/PixelMap.ts'

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
    component: NormalMapToImageLighting,
  },
  {
    def: 'bitmask_island_edges',
    displayName: 'BitMask Add Edge Island',
    component: BitMaskIslandEdges,
  },
  {
    def: 'bitmask_grow_islands',
    displayName: 'BitMask Islands Grow',
    component: BitMaskIslandsGrow,
  },
  {
    def: 'bitmask_add_islands',
    displayName: 'BitMask Add Islands',
    component: BitMaskIslandsAdd,
  },
]

export interface DataStructureConstructor<
  T extends BaseDataStructure<any, any> = BaseDataStructure<any, any>
> {
  new(width: number, height: number, ...args: any[]): T
}

export const STEP_DATA_TYPES: DataStructureConstructor[] = [
  BitMask as DataStructureConstructor,
  NormalMap as DataStructureConstructor,
  HeightMap as DataStructureConstructor,
  PixelMap as DataStructureConstructor,
]

export type StepDataType =
  | typeof BitMask
  | typeof NormalMap
  | typeof HeightMap
  | typeof PixelMap

export type StepDataTypeInstance = BitMask | NormalMap | HeightMap | PixelMap