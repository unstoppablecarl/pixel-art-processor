import type { NodeDataType } from './lib/node-data-types/_node-data-types.ts'
import { type NodeDataTypeColor } from './lib/pipeline/_types.ts'
import { loadNodeComponentsMetaData } from './lib/pipeline/NodeMeta.ts'
import type { AnyNodeDefinition } from './lib/pipeline/types/definitions.ts'
import { type DataStructureConstructor } from './lib/node-data-types/BaseDataStructure.ts'
import { BitMask } from './lib/node-data-types/BitMask.ts'
import { HeightMap } from './lib/node-data-types/HeightMap.ts'
import { NormalMap } from './lib/node-data-types/NormalMap.ts'
import { PassThrough } from './lib/node-data-types/PassThrough.ts'
import { PixelMap } from './lib/node-data-types/PixelMap.ts'

export const NODE_DATA_TYPES: DataStructureConstructor[] = [
  BitMask as DataStructureConstructor,
  NormalMap as DataStructureConstructor,
  HeightMap as DataStructureConstructor,
  PixelMap as DataStructureConstructor,
  PassThrough as DataStructureConstructor,
]

const nodeModules = import.meta.glob(['./components/Node/**/*.vue'])

const green = '#146c43'
const pink = '#ab296a'
const purple = '#59359a'
const blue = '#0a58ca'

export type NodeDataTypeColors = typeof NODE_DATA_TYPE_COLORS
export const NODE_DATA_TYPE_COLORS = new Map<NodeDataType, NodeDataTypeColor>([
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

export function getNodeDataTypeCssClass(stepDataType: NodeDataType) {
  return NODE_DATA_TYPE_COLORS.get(stepDataType)!.cssClass
}


// ⚠️ the code below only works if it is in this file
let nodeLoadPromise: Promise<AnyNodeDefinition[]> | null = null

export function loadNodeDefinitions(): Promise<AnyNodeDefinition[]> {
  if (!nodeLoadPromise) {
    nodeLoadPromise = (async () => {
      const loadedModules: Record<string, any> = {}
      for (const [path, loader] of Object.entries(nodeModules)) {
        loadedModules[path] = await (loader as () => Promise<any>)()
      }
      return loadNodeComponentsMetaData(loadedModules, NODE_DATA_TYPES)
    })()
  }

  return nodeLoadPromise
}

if (import.meta.hot && !import.meta.env.VITEST) {
  import.meta.hot.accept(async () => {
    nodeLoadPromise = null

    const nodeDefinitions = await loadNodeDefinitions()
    const { installNodeRegistry, makeNodeRegistry } = await import('./lib/pipeline/NodeRegistry.ts')
    installNodeRegistry(makeNodeRegistry(nodeDefinitions, NODE_DATA_TYPES))
  })
}