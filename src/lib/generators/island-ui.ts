import { type Ref, toRef } from 'vue'
import type { CheckboxColorListItem } from '../../components/UIForms/CheckboxColorList.vue'
import type { Point } from '../step-data-types/BaseDataStructure.ts'
import { BitMask } from '../step-data-types/BitMask.ts'
import { type Island, IslandType } from '../step-data-types/BitMask/Island.ts'
import { parseColorData } from '../util/color.ts'
import { Sketch } from '../util/Sketch.ts'

const ALL_FEATURES: FeatureDefinition[] = []

type FeatureDefinition = {
  label: string,
  CONFIG: Record<string, unknown>
}

function create<T extends FeatureDefinition>(obj: T): T {
  ALL_FEATURES.push(obj)
  return obj
}

export const DEFAULT_SHOW_ISLANDS = create({
  label: 'Islands',
  CONFIG: {
    showIsland: true,
    showIslandColor: 'rgba(255, 255, 255, 1)',
  },
})

export const DEFAULT_EXPANDABLE = create({
  label: 'Expandable',
  CONFIG: {
    showExpandable: false,
    showExpandableColor: 'rgba(255, 0, 0, 0.5)',
  },
})

export const DEFAULT_EXPANDABLE_BOUNDS = create({
  label: 'Expandable Bounds',
  CONFIG: {
    showExpandableBounds: false,
    showExpandableBoundsColor: 'rgba(0, 0, 255, 0.5)',
  },
})

export const DEFAULT_EXPANDABLE_RESPECTING_DISTANCE = create({
  label: 'Expandable Dist.',
  CONFIG: {
    showExpandableRespectingDistance: false,
    showExpandableRespectingDistanceColor: 'rgba(0, 255, 0, 0.5)',
  },
})

export const DEFAULT_SHOW_ADDED = create({
  label: 'Added',
  CONFIG: {
    showAdded: false,
    showAddedColor: 'rgba(100, 255, 100, 0.5)',
  },
})

export const DEFAULT_SHOW_REMOVED = create({
  label: 'Removed',
  CONFIG: {
    showRemoved: false,
    showRemovedColor: 'rgba(255, 0, 255, 0.5)',
  },
})

type FeatureMeta = {
  label: string
  flagKey: string
  colorKey: string
  defaultColor: string
}

function inferMetaFromFeature(feature: { label: string; CONFIG: Record<string, unknown> }): FeatureMeta {
  const cfg = feature.CONFIG
  const [flagKey, colorKey] = Object.keys(cfg)

  const defaultColor = String(cfg[colorKey as string])

  return {
    label: feature.label,
    flagKey: flagKey as string,
    colorKey: colorKey as string,
    defaultColor,
  }
}

const FEATURE_REGISTRY: FeatureMeta[] = ALL_FEATURES.map(inferMetaFromFeature)
const DEFAULT_ISLAND_VISIBILITY_CONFIG = Object.assign({}, ...ALL_FEATURES.map((f) => f.CONFIG))

export function islandCheckboxColors<T extends Record<string, unknown>>(
  config: T,
): CheckboxColorListItem[] {
  return FEATURE_REGISTRY
    .filter((meta) => meta.flagKey in config && meta.colorKey in config)
    .map((meta) => ({
      label: meta.label,
      active: toRef(config as Record<string, any>, meta.flagKey) as Ref<boolean>,
      color: toRef(config as Record<string, any>, meta.colorKey),
      defaultColor: meta.defaultColor,
    }))
}

export function sketchIslandVisuals<C extends Partial<typeof DEFAULT_ISLAND_VISIBILITY_CONFIG> & {
  minDistance?: number
}>(
  mask: BitMask,
  config: C,
  filteredIslands: Island[],
  islands: Island[],
  added?: Point[],
  removed?: Point[],
) {
  const sketch = new Sketch(mask.width, mask.height)
  const islandColor = parseColorData(config.showIslandColor)

  if (config.showIsland) {
    sketch.putImageData(mask.toImageData(islandColor))
  }

  filteredIslands.forEach((i) => {
    if (config.showExpandableBounds) {
      sketch.fillRectBounds(i.expandableBounds.growNew(1), config.showExpandableBoundsColor)
    }

    if (config.showExpandable) {
      i.getExpandable().forEach(({ x, y }) => {
        sketch.setPixel(x, y, config.showExpandableColor)
      })
    }

    const minDistance = config.minDistance ?? 0

    if (config.showExpandableRespectingDistance) {
      i.getExpandableRespectingMinDistance(islands, minDistance).forEach(({ x, y }) => {
        sketch.setPixel(x, y, config.showExpandableRespectingDistanceColor)
      })
    }
  })

  if (config.showAdded) {
    added?.forEach(({ x, y }) => {
      sketch.setPixel(x, y, config.showAddedColor)
    })
  }

  if (config.showRemoved) {
    removed?.forEach(({ x, y }) => {
      sketch.setPixel(x, y, config.showRemovedColor)
    })
  }

  return sketch
}

export enum IslandFilterType {
  ALL,
  INNER,
  EDGE,
}

export const ISLAND_FILTERS: Record<IslandFilterType, { label: string, filter: (i: Island) => boolean }> = {
  [IslandFilterType.ALL]: {
    label: 'All',
    filter: (i: Island) => true,
  },
  [IslandFilterType.INNER]: {
    label: 'Inner',
    filter: (i: Island) => i.type === IslandType.NORMAL,
  },
  [IslandFilterType.EDGE]: {
    label: 'Edge',
    filter: (i: Island) => i.type !== IslandType.NORMAL,
  },
}

export const ISLAND_TYPES_FILTER_OPTIONS = Object.fromEntries(
  Object.entries(ISLAND_FILTERS).map(([key, val]) => [key, val.label]),
)