import { toRef } from 'vue'
import type { CheckboxColorListItem } from '../../components/UI/CheckboxColorList.vue'
import { BitMask } from '../step-data-types/BitMask.ts'
import { type Island, IslandType } from '../step-data-types/BitMask/Island.ts'
import { parseColorData } from '../util/color.ts'
import { Sketch } from '../util/Sketch.ts'

export const DEFAULT_ISLAND_COLORS = {
  showExpandableBoundsColor: 'rgba(0, 0, 255, 0.5)',
  showExpandableColor: 'rgba(255, 0, 0, 0.5)',
  showExpandableRespectingDistanceColor: 'rgba(0, 255, 0, 0.5)',
  showIslandColor: 'rgba(255, 255, 255, 1)',
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

export function islandCheckboxColors<T extends typeof DEFAULT_ISLAND_VISIBILITY_CONFIG>(config: T): CheckboxColorListItem[] {
  return [
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
      active: toRef(config, 'showExpandableBounds'),
      color: toRef(config, 'showExpandableBoundsColor'),
      defaultColor: DEFAULT_ISLAND_COLORS.showExpandableBoundsColor,
    },
  ]
}

export function sketchIslandVisuals<C extends typeof DEFAULT_ISLAND_VISIBILITY_CONFIG & { minDistance: number }>(
  mask: BitMask,
  config: C,
  filteredIslands: Island[],
  islands: Island[],
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

    if (config.showExpandableRespectingDistance) {
      i.getExpandableRespectingMinDistance(islands, config.minDistance).forEach(({ x, y }) => {
        sketch.setPixel(x, y, config.showExpandableRespectingDistanceColor)
      })
    }
  })
  return sketch
}