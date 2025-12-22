import { type Ref, toRef } from 'vue'
import type { CheckboxColorListItem } from '../../components/UI/CheckboxColorList.vue'
import type { Point } from '../step-data-types/BaseDataStructure.ts'
import { BitMask } from '../step-data-types/BitMask.ts'
import { type Island, IslandType } from '../step-data-types/BitMask/Island.ts'
import { parseColorData } from '../util/color.ts'
import { Sketch } from '../util/Sketch.ts'

export const DEFAULT_ISLAND_COLORS = {
  showExpandableBoundsColor: 'rgba(0, 0, 255, 0.5)',
  showExpandableColor: 'rgba(255, 0, 0, 0.5)',
  showExpandableRespectingDistanceColor: 'rgba(0, 255, 0, 0.5)',
  showIslandColor: 'rgba(255, 255, 255, 1)',
  showAddedColor: 'rgba(100, 255, 100, 0.5)',
  showRemovedColor: 'rgba(255, 0, 255, 0.5)',
}

export const DEFAULT_ISLAND_VISIBILITY_CONFIG = {
  showExpandableBounds: false,
  showExpandable: false,
  showExpandableRespectingDistance: false,
  showIsland: true,
  ...DEFAULT_ISLAND_COLORS,
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

type ShowAddedAndRemoved = {
  showAdded?: boolean,
  showRemoved?: boolean,
}

export function islandCheckboxColors<T extends typeof DEFAULT_ISLAND_VISIBILITY_CONFIG & ShowAddedAndRemoved>(config: T): CheckboxColorListItem[] {
  const result = [
    {
      label: 'Islands',
      active: toRef(config, 'showIsland'),
      color: toRef(config, 'showIslandColor'),
      defaultColor: DEFAULT_ISLAND_COLORS.showIslandColor,
    },
    {
      label: 'Expandable',
      active: toRef(config, 'showExpandable'),
      color: toRef(config, 'showExpandableColor'),
      defaultColor: DEFAULT_ISLAND_COLORS.showExpandableColor,
    },
    {
      label: 'Expandable Dist.',
      active: toRef(config, 'showExpandableRespectingDistance'),
      color: toRef(config, 'showExpandableRespectingDistanceColor'),
      defaultColor: DEFAULT_ISLAND_COLORS.showExpandableRespectingDistanceColor,
    },
    {
      label: 'Expandable Bounds',
      active: toRef(config, 'showExpandableBounds') as Ref<boolean>,
      color: toRef(config, 'showExpandableBoundsColor'),
      defaultColor: DEFAULT_ISLAND_COLORS.showExpandableBoundsColor,
    },
  ]

  if (config.showAdded !== undefined) {
    result.push({
      label: 'Added',
      active: toRef(config, 'showAdded') as Ref<boolean>,
      color: toRef(config, 'showAddedColor'),
      defaultColor: DEFAULT_ISLAND_COLORS.showAddedColor,
    })
  }

  if (config.showRemoved !== undefined) {
    result.push({
      label: 'Removed',
      active: toRef(config, 'showRemoved') as Ref<boolean>,
      color: toRef(config, 'showRemovedColor'),
      defaultColor: DEFAULT_ISLAND_COLORS.showRemovedColor,
    })
  }
  return result
}

export function sketchIslandVisuals<C extends typeof DEFAULT_ISLAND_VISIBILITY_CONFIG & {
  minDistance?: number
} & ShowAddedAndRemoved>(
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