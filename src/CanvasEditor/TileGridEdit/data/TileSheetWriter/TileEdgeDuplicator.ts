import type { PixelWriter } from '../../../../../../pixel-data-js/src'
import type { Direction } from '../../../../lib/pipeline/_types.ts'
import { type TileId, type WangTile } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from '../TileSheet.ts'

export function duplicateEdgePixels(
  targetTileIds: TileId[],
  borderThickness = 1,
  tileSheet: TileSheet,
  writer: PixelWriter<any>,
): TileId[] | undefined {
  if (borderThickness <= 0) return

  const affectedCount = targetTileIds.length
  if (affectedCount === 0) return

  const tileset = tileSheet.tileset
  const tileSize = tileSheet.tileSize
  const max = tileSize - 1

  const target = writer.config.target
  const targetData = target.data
  const targetWidth = target.w

  const chunkDim = writer.config.tileSize
  const invChunkSize = 1 / chunkDim
  const targetColumns = writer.config.targetColumns
  const lookup = writer.accumulator.lookup

  const affectedTileIds = new Set<TileId>()

  const copyToEdge = (
    destTiles: WangTile<number>[],
    tx: number,
    ty: number,
    afterColor: number,
    edgeDirection: Direction,
    isMirrored: boolean,
  ) => {
    const length = destTiles.length

    for (let j = 0; j < length; j++) {
      const destTile = destTiles[j]
      const dTileId = destTile.id
      const dOffset = tileSheet.getTileSheetOffset(dTileId)

      let dx = tx
      let dy = ty

      if (isMirrored) {
        if (edgeDirection === 'N' || edgeDirection === 'S') {
          dy = max - ty
        } else {
          dx = max - tx
        }
      }

      const globalDx = dOffset.x + dx
      const globalDy = dOffset.y + dy

      writer.accumulator.storePixelBeforeState(globalDx, globalDy)

      const pIdx = globalDy * targetWidth + globalDx
      targetData[pIdx] = afterColor
      affectedTileIds.add(dTileId)
    }
  }

  for (let i = 0; i < affectedCount; i++) {
    const tileId = targetTileIds[i]
    const tile = tileset.byId.get(tileId)!
    const offset = tileSheet.getTileSheetOffset(tileId)
    const offsetX = offset.x
    const offsetY = offset.y

    const nEdge = tileset.getTilesWithSameEdge(tile, 'N')
    const sEdge = tileset.getTilesWithSameEdge(tile, 'S')
    const wEdge = tileset.getTilesWithSameEdge(tile, 'W')
    const eEdge = tileset.getTilesWithSameEdge(tile, 'E')

    const processPixel = (
      tx: number,
      ty: number,
      isNorth: boolean,
      isSouth: boolean,
      isWest: boolean,
      isEast: boolean,
    ) => {
      const gx = offsetX + tx
      const gy = offsetY + ty

      const chunkX = (gx * invChunkSize) | 0
      const chunkY = (gy * invChunkSize) | 0
      const chunkId = chunkY * targetColumns + chunkX

      const chunk = lookup[chunkId]

      // If no chunk exists, this pixel wasn't in the undo buffer,
      // meaning it wasn't touched by this specific mutation.
      if (!chunk) return

      const localX = gx - chunkX * chunkDim
      const localY = gy - chunkY * chunkDim
      const beforeColor = chunk.data[localY * chunkDim + localX]

      const globalIdx = gy * targetWidth + gx
      const afterColor = targetData[globalIdx]

      if (beforeColor === afterColor) return

      if (isNorth) {
        copyToEdge(nEdge.sameEdge, tx, ty, afterColor, 'N', false)
        copyToEdge(nEdge.mirroredEdge, tx, ty, afterColor, 'N', true)
      }

      if (isSouth) {
        copyToEdge(sEdge.sameEdge, tx, ty, afterColor, 'S', false)
        copyToEdge(sEdge.mirroredEdge, tx, ty, afterColor, 'S', true)
      }

      if (isWest) {
        copyToEdge(wEdge.sameEdge, tx, ty, afterColor, 'W', false)
        copyToEdge(wEdge.mirroredEdge, tx, ty, afterColor, 'W', true)
      }

      if (isEast) {
        copyToEdge(eEdge.sameEdge, tx, ty, afterColor, 'E', false)
        copyToEdge(eEdge.mirroredEdge, tx, ty, afterColor, 'E', true)
      }
    }

    for (let ty = 0; ty < tileSize; ty++) {
      const isNorth = ty < borderThickness
      const isSouth = ty > max - borderThickness

      if (isNorth || isSouth) {
        for (let tx = 0; tx < tileSize; tx++) {
          const isWest = tx < borderThickness
          const isEast = tx > max - borderThickness

          processPixel(tx, ty, isNorth, isSouth, isWest, isEast)
        }
      } else {
        // Skip the inner horizontal span entirely
        for (let tx = 0; tx < borderThickness; tx++) {
          processPixel(tx, ty, false, false, true, false)
        }

        for (let tx = tileSize - borderThickness; tx < tileSize; tx++) {
          processPixel(tx, ty, false, false, false, true)
        }
      }
    }
  }

  return Array.from(affectedTileIds)
}