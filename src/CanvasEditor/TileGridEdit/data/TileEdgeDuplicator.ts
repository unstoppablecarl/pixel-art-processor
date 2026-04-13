import type { PixelWriter } from '../../../../../pixel-data-js/src'
import { type TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from './TileSheet.ts'

export function duplicateEdgePixels(
  tileId: TileId,
  borderThickness = 1,
  tileSheet: TileSheet,
  writer: PixelWriter<any>,
) {
  if (borderThickness <= 0) return

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

  const offset = tileSheet.getTileSheetOffset(tileId)
  const offsetX = offset.x
  const offsetY = offset.y

  const tile = tileset.byId.get(tileId)!

  const nEdge = tileset.getTilesWithSameEdge(tile, 'N')
  const sEdge = tileset.getTilesWithSameEdge(tile, 'S')
  const wEdge = tileset.getTilesWithSameEdge(tile, 'W')
  const eEdge = tileset.getTilesWithSameEdge(tile, 'E')

  const copyToEdge = (
    destTiles: any[],
    flipX: boolean,
    flipY: boolean,
    tx: number,
    ty: number,
    afterColor: number,
  ) => {
    const length = destTiles.length

    for (let j = 0; j < length; j++) {
      const destTile = destTiles[j]
      const dTileId = destTile.id
      const dOffset = tileSheet.getTileSheetOffset(dTileId)

      const dx = flipX ? max - tx : tx
      const dy = flipY ? max - ty : ty

      const globalDx = dOffset.x + dx
      const globalDy = dOffset.y + dy

      writer.accumulator.storePixelBeforeState(globalDx, globalDy)

      const pIdx = globalDy * targetWidth + globalDx
      targetData[pIdx] = afterColor
    }
  }

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

    if (!chunk) return


    const localX = gx - chunkX * chunkDim
    const localY = gy - chunkY * chunkDim
    const beforeColor = chunk.data[localY * chunkDim + localX]

    const globalIdx = gy * targetWidth + gx
    const afterColor = targetData[globalIdx]

    if (beforeColor === afterColor) return

    if (isNorth) {
      copyToEdge(
        nEdge.sameEdge,
        false,
        false,
        tx,
        ty,
        afterColor,
      )
      copyToEdge(
        nEdge.mirroredEdge,
        false,
        true,
        tx,
        ty,
        afterColor,
      )
    }

    if (isSouth) {
      copyToEdge(
        sEdge.sameEdge,
        false,
        false,
        tx,
        ty,
        afterColor,
      )
      copyToEdge(
        sEdge.mirroredEdge,
        false,
        true,
        tx,
        ty,
        afterColor,
      )
    }

    if (isWest) {
      copyToEdge(
        wEdge.sameEdge,
        false,
        false,
        tx,
        ty,
        afterColor,
      )
      copyToEdge(
        wEdge.mirroredEdge,
        true,
        false,
        tx,
        ty,
        afterColor,
      )
    }

    if (isEast) {
      copyToEdge(
        eEdge.sameEdge,
        false,
        false,
        tx,
        ty,
        afterColor,
      )
      copyToEdge(
        eEdge.mirroredEdge,
        true,
        false,
        tx,
        ty,
        afterColor,
      )
    }
  }

  // Iterate strictly over the perimeter rather than the entire tile
  for (let ty = 0; ty < tileSize; ty++) {
    const isNorth = ty < borderThickness
    const isSouth = ty > max - borderThickness

    if (isNorth || isSouth) {
      for (let tx = 0; tx < tileSize; tx++) {
        const isWest = tx < borderThickness
        const isEast = tx > max - borderThickness

        processPixel(
          tx,
          ty,
          isNorth,
          isSouth,
          isWest,
          isEast,
        )
      }
    } else {
      for (let tx = 0; tx < borderThickness; tx++) {
        processPixel(
          tx,
          ty,
          false,
          false,
          true,
          false,
        )
      }

      for (let tx = tileSize - borderThickness; tx < tileSize; tx++) {
        processPixel(
          tx,
          ty,
          false,
          false,
          false,
          true,
        )
      }
    }
  }
}