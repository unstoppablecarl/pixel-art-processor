import type { PixelWriter } from 'pixel-data-js'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'
import type { TileSheet } from '../TileSheet.ts'
import { selectMirrorAffectedWangEdges } from './selectMirrorAffectedWangEdges.ts'

export function duplicateChangedEdgePixels(
  affectedTileIds: TileId[],
  borderThickness: number,
  tileSheet: TileSheet,
  writer: PixelWriter<any>,
): TileId[] {
  if (borderThickness <= 0) return []
  if (affectedTileIds.length === 0) return []

  const tileSize = tileSheet.tileSize
  const target = writer.config.target
  const targetData = target.data
  const targetWidth = target.w

  const chunkDim = writer.config.tileSize
  const invChunkSize = 1 / chunkDim
  const targetColumns = writer.config.targetColumns
  const lookup = writer.accumulator.lookup

  const changedTiles = new Set<TileId>()

  selectMirrorAffectedWangEdges(
    affectedTileIds,
    borderThickness,
    tileSize,
    tileSheet.tileset,
    {
      getPixelColorIfChanged: (
        tileId: TileId,
        tx: number,
        ty: number,
      ) => {
        const offset = tileSheet.getTileSheetOffset(tileId)
        const gx = offset.x + tx
        const gy = offset.y + ty

        const chunkX = (gx * invChunkSize) | 0
        const chunkY = (gy * invChunkSize) | 0
        const chunkId = chunkY * targetColumns + chunkX

        const chunk = lookup[chunkId]

        if (!chunk) return undefined

        const localX = gx - chunkX * chunkDim
        const localY = gy - chunkY * chunkDim
        const beforeColor = chunk.data[localY * chunkDim + localX]

        const globalIdx = gy * targetWidth + gx
        const afterColor = targetData[globalIdx]

        if (beforeColor === afterColor) return undefined

        return afterColor
      },
      writeMirroredPixel: (
        destTileId: TileId,
        dx: number,
        dy: number,
        color: number,
      ) => {
        const offset = tileSheet.getTileSheetOffset(destTileId)
        const gDx = offset.x + dx
        const gDy = offset.y + dy

        const pIdx = gDy * targetWidth + gDx

        if (targetData[pIdx] !== color) {
          writer.accumulator.storePixelBeforeState(gDx, gDy)
          targetData[pIdx] = color
          changedTiles.add(destTileId)
        }
      },
    },
  )

  return Array.from(changedTiles)
}