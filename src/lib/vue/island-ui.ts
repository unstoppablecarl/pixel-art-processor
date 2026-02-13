import type { Point } from '../node-data-types/BaseDataStructure.ts'
import { BitMask } from '../node-data-types/BitMask.ts'
import { type Island, IslandType } from '../node-data-types/BitMask/Island.ts'
import { parseColor } from '../util/data/color.ts'
import { Sketch } from '../util/html-dom/Sketch.ts'
import { makeCheckboxColorConfig } from './CheckboxColorConfig.ts'

const {
  create,
  configToCheckboxColorListItems,
} = makeCheckboxColorConfig()

export const islandsDrawCheckboxColors = configToCheckboxColorListItems

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

export function sketchIslandVisuals<C extends Partial<any> & {
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
  const islandColor = parseColor(config.showIslandColor)

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
} as const

export const ISLAND_TYPES_FILTER_OPTIONS = Object.fromEntries(
  Object.entries(ISLAND_FILTERS).map(([key, val]) => [key, val.label]),
)