import { loadStepComponentsMetaData } from './lib/pipeline/StepMeta.ts'
import type { AnyStepDefinition } from './lib/pipeline/StepRegistry.ts'
import { type DataStructureConstructor } from './lib/step-data-types/BaseDataStructure.ts'
import { BitMask } from './lib/step-data-types/BitMask.ts'
import { HeightMap } from './lib/step-data-types/HeightMap.ts'
import { NormalMap } from './lib/step-data-types/NormalMap.ts'
import { PassThrough } from './lib/step-data-types/PassThrough.ts'
import { PixelMap } from './lib/step-data-types/PixelMap.ts'

export const STEP_DATA_TYPES: DataStructureConstructor[] = [
  BitMask as DataStructureConstructor,
  NormalMap as DataStructureConstructor,
  HeightMap as DataStructureConstructor,
  PixelMap as DataStructureConstructor,
  PassThrough as DataStructureConstructor,
]

const stepModules = import.meta.glob(['./components/Step/**/*.vue'], { eager: true })

export const STEP_DEFINITIONS: AnyStepDefinition[] = loadStepComponentsMetaData(stepModules as Record<string, any>, STEP_DATA_TYPES)

export type StepDataType =
  | typeof BitMask
  | typeof NormalMap
  | typeof HeightMap
  | typeof PixelMap
  | typeof PassThrough

export type StepDataTypeInstance =
  | BitMask
  | NormalMap
  | HeightMap
  | PixelMap
  | PassThrough