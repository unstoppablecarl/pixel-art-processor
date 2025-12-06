import type { Point } from '../step-data-types/BaseDataStructure.ts'
import { BitMask } from '../step-data-types/BitMask.ts'
import { Island, type IslandFilter, type IslandPointFilter } from '../step-data-types/BitMask/Island.ts'

export type IslandIterator = (
  mask: BitMask,
  islands: Island[],
  island: Island,
  expandable: Point[],
  claim: (x: number, y: number) => void,
  release: (x: number, y: number) => void,
) => void

export type GroIslandsOptions = {
  mask: BitMask,
  islands: Island[],
  minDistance: number,
  islandFilter?: IslandFilter,
  pointFilter?: IslandPointFilter,
  iterations: number,
  iterator: IslandIterator,
}

export function growIslands(
  {
    mask,
    islands,
    minDistance,
    islandFilter,
    pointFilter,
    iterations,
    iterator,
  }: GroIslandsOptions,
) {

  let island: Island

  const claim = (x: number, y: number) => island.claimPoint(x, y)
  const release = (x: number, y: number) => island.releasePoint(x, y)

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < islands.length; i++) {
      island = islands[i]

      if (islandFilter?.(island, i) === false) continue

      const expandable = island.getExpandableRespectingMinDistance(islands, minDistance, islandFilter, pointFilter)

      if (!expandable.length) continue

      iterator(mask, islands, island, expandable, claim, release)
    }
  }
}