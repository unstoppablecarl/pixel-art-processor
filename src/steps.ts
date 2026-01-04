import { type AnyStepDefinition, type NodeDataTypeColor, type StepDataType } from './lib/pipeline/_types.ts'
import { loadStepComponentsMetaData } from './lib/pipeline/StepMeta.ts'
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

const stepModules = import.meta.glob(['./components/Step/**/*.vue'])

let loadPromise: Promise<AnyStepDefinition[]> | null = null

export function loadStepDefinitions(): Promise<AnyStepDefinition[]> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const loadedModules: Record<string, any> = {}

      for (const [path, loader] of Object.entries(stepModules)) {
        loadedModules[path] = await (loader as () => Promise<any>)()
      }

      return loadStepComponentsMetaData(loadedModules, STEP_DATA_TYPES)
    })()
  }

  return loadPromise
}

if (import.meta.hot && !import.meta.env.VITEST) {
  import.meta.hot.accept(async () => {
    loadPromise = null

    const stepDefinitions = await loadStepDefinitions()
    const { installStepRegistry, makeStepRegistry } = await import('./lib/pipeline/StepRegistry.ts')
    installStepRegistry(makeStepRegistry(stepDefinitions, STEP_DATA_TYPES))
  })
}


const green = '#146c43'
const pink = '#ab296a'
const purple = '#59359a'
const blue = '#0a58ca'

export type NodeDataTypeColors = typeof STEP_DATA_TYPE_COLORS
export const STEP_DATA_TYPE_COLORS = new Map<StepDataType, NodeDataTypeColor>([
  [BitMask, { key: '--bit-mask-color', color: green, cssClass: 'bit-mask-bg' }],
  [HeightMap, { key: '--height-map-color', color: pink, cssClass: 'height-map-bg' }],
  [NormalMap, { key: '--normal-map-color', color: purple, cssClass: 'normal-map-bg' }],
  [PixelMap, { key: '--pixel-map-color', color: blue, cssClass: 'pixel-map-bg' }],
  [PassThrough, {
    key: '--pass-through-color',
    color: 'linear-gradient(90deg, rgba(0, 255, 255, 1) 0%, rgba(255, 0, 255, 1) 100%)',
    cssClass: 'pass-through-bg',
  }],
])

export function getNodeDataTypeCssClass(stepDataType: StepDataType) {
  return STEP_DATA_TYPE_COLORS.get(stepDataType)!.cssClass
}

