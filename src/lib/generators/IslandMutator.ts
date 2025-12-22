import type { Point } from '../step-data-types/BaseDataStructure.ts'
import { BitMask } from '../step-data-types/BitMask.ts'
import { Island, type IslandFilter } from '../step-data-types/BitMask/Island.ts'

export type IslandMutatorResult = {
  added: Point[],
  removed: Point[],
}
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
  islandFilter?: IslandFilter,
  getPoints: (i: Island) => Point[],
  iterations: number,
  iterator: IslandMutator,
}

export function mutateIslands(
  {
    mask,
    islands,
    islandFilter,
    getPoints,
    iterations,
    iterator,
  }: MutateIslandsOptions,
): IslandMutatorResult {

  let island: Island
  const added: Point[] = []
  const removed: Point[] = []

  const claim = (x: number, y: number) => {
    added.push({ x, y })
    island.claimPoint(x, y)
  }
  const release = (x: number, y: number) => {
    removed.push({ x, y })
    island.releasePoint(x, y)
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < islands.length; i++) {
      island = islands[i]

      if (islandFilter?.(island, i) === false) continue

      const points = getPoints(island)

      if (!points.length) continue

      iterator(mask, islands, island, points, claim, release)
    }
  }

  return {
    added,
    removed,
  }
}