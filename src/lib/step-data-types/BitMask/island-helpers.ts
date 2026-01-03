import type { BoundsLike } from '../../data/Bounds.ts'
import { CARDINAL_DIRECTIONS, type Point } from '../BaseDataStructure.ts'
import type { BitMask } from '../BitMask.ts'
import { Island, IslandType } from './Island.ts'

export function getIslands(mask: BitMask): Island[] {
  const visited = new Set<string>()
  const islands: Island[] = []

  let idIncrement = 0
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.get(x, y) === 1 && !visited.has(x + ',' + y)) {
        const { minX, maxX, minY, maxY } = findIslandBounds(mask, x, y, visited)

        let type = getIslandType(mask, minY, maxY, minX, maxX)

        islands.push(new Island(mask, idIncrement++, minX, maxX, minY, maxY, type))
      }
    }
  }

  return islands
}

function findIslandBounds(mask: BitMask, startX: number, startY: number, visited: Set<string>): BoundsLike {
  const stack: Point[] = [{ x: startX, y: startY }]
  visited.add(startX + ',' + startY)

  let minX = startX
  let maxX = startX
  let minY = startY
  let maxY = startY

  while (stack.length > 0) {
    const { x, y } = stack.pop()!

    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)

    for (const [dx, dy] of CARDINAL_DIRECTIONS) {
      const nx = x + dx
      const ny = y + dy

      if (
        nx >= 0 &&
        nx < mask.width &&
        ny >= 0 &&
        ny < mask.height &&
        mask.get(nx, ny) === 1 &&
        !visited.has(nx + ',' + ny)
      ) {
        visited.add(nx + ',' + ny)
        stack.push({ x: nx, y: ny })
      }
    }
  }
  maxX += 1
  maxY += 1
  return { minX, maxX, minY, maxY }
}


function getIslandType(mask: BitMask, minY: number, maxY: number, minX: number, maxX: number) {
  let topCount = 0
  if (minY === 0) {
    for (let x = minX; x < maxX; x++) {
      if (mask.get(x, 0) === 1) topCount++
    }
  }
  let bottomCount = 0
  if (maxY === mask.height) {
    const bottomY = mask.height - 1
    for (let x = minX; x < maxX; x++) {
      if (mask.get(x, bottomY) === 1) bottomCount++
    }
  }
  let leftCount = 0
  if (minX === 0) {
    for (let y = minY; y < maxY; y++) {
      if (mask.get(0, y) === 1) leftCount++
    }
  }
  let rightCount = 0
  if (maxX === mask.width) {
    const rightX = mask.width - 1
    for (let y = minY; y < maxY; y++) {
      if (mask.get(rightX, y) === 1) rightCount++
    }
  }

  const horzCount = Math.max(topCount, bottomCount)
  const vertCount = Math.max(leftCount, rightCount)

  if (horzCount > vertCount) {
    if (topCount > bottomCount) {
      return IslandType.TOP_EDGE
    } else if (bottomCount > topCount) {
      return IslandType.BOTTOM_EDGE
    } else {
      return IslandType.TOP_EDGE | IslandType.BOTTOM_EDGE
    }
  } else if (vertCount > horzCount) {
    if (leftCount > rightCount) {
      return IslandType.LEFT_EDGE
    } else if (rightCount > leftCount) {
      return IslandType.RIGHT_EDGE
    } else {
      return IslandType.LEFT_EDGE | IslandType.RIGHT_EDGE
    }
  } else {
    return IslandType.NORMAL
  }
}