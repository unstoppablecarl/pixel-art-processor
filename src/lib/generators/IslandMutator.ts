import type { Point } from '../step-data-types/BaseDataStructure.ts'
import { BitMask } from '../step-data-types/BitMask.ts'
import { Island, type IslandFilter, type IslandPointFilter } from '../step-data-types/BitMask/Island.ts'

export type IslandMutator = (
  mask: BitMask,
  islands: Island[],
  island: Island,
  points: Point[],
  claim: (x: number, y: number) => void,
  release: (x: number, y: number) => void,
) => void

export type MutateIslandsOptions = {
  mask: BitMask,
  islands: Island[],
  minDistance: number,
  islandFilter?: IslandFilter,
  pointFilter?: IslandPointFilter,
  iterations: number,
  iterator: IslandMutator,
}

export function mutateIslandsExpansion(
  {
    mask,
    islands,
    minDistance,
    islandFilter,
    pointFilter,
    iterations,
    iterator,
  }: MutateIslandsOptions,
) {

  let island: Island

  const claim = (x: number, y: number) => island.claimPoint(x, y)
  const release = (x: number, y: number) => island.releasePoint(x, y)

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < islands.length; i++) {
      island = islands[i]

      if (islandFilter?.(island, i) === false) continue

      const points = island.getExpandableRespectingMinDistance(islands, minDistance, pointFilter)

      if (!points.length) continue

      iterator(mask, islands, island, points, claim, release)
    }
  }
}

export function mutateIslandsErosion(
  {
    mask,
    islands,
    minDistance,
    islandFilter,
    pointFilter,
    iterations,
    iterator,
  }: MutateIslandsOptions,
) {

  let island: Island

  const claim = (x: number, y: number) => island.claimPoint(x, y)
  const release = (x: number, y: number) => island.releasePoint(x, y)

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < islands.length; i++) {
      island = islands[i]

      if (islandFilter?.(island, i) === false) continue

      let points = island.getEdge()

      if (pointFilter) {
        points = points.filter(({ x, y }) => pointFilter(x, y, island))
      }

      if (!points.length) continue

      iterator(mask, islands, island, points, claim, release)
    }
  }
}