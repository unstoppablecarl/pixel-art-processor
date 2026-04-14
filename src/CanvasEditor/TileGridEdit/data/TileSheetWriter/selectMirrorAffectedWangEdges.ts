import type { Direction } from '../../../../lib/pipeline/_types.ts'
import { type TileId, type WangTile, WangTileset } from '../../../../lib/wang-tiles/WangTileset.ts'

export interface WangEdgeMirrorCallbacks {
  getPixelColorIfChanged: (
    tileId: TileId,
    tx: number,
    ty: number,
  ) => number | undefined

  writeMirroredPixel: (
    destTileId: TileId,
    dx: number,
    dy: number,
    color: number,
  ) => void
}

export function selectMirrorAffectedWangEdges(
  affectedTileIds: readonly TileId[],
  borderThickness: number,
  tileSize: number,
  tileset: WangTileset<number>,
  callbacks: WangEdgeMirrorCallbacks,
) {
  if (borderThickness <= 0) return

  const affectedCount = affectedTileIds.length
  if (affectedCount === 0) return

  const max = tileSize - 1
  const getPixelColorIfChanged = callbacks.getPixelColorIfChanged
  const writeMirroredPixel = callbacks.writeMirroredPixel

  for (let i = 0; i < affectedCount; i++) {
    const tileId = affectedTileIds[i]
    const tile = tileset.byId.get(tileId)

    if (!tile) continue

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
      const color = getPixelColorIfChanged(tileId, tx, ty)

      if (color === undefined) return

      const copyToEdge = (
        destTiles: readonly WangTile<number>[],
        edgeType: Direction,
        isMirrored: boolean,
      ) => {
        const length = destTiles.length

        for (let j = 0; j < length; j++) {
          const destTile = destTiles[j]
          const dTileId = destTile.id

          let dx = tx
          let dy = ty

          if (isMirrored) {
            if (edgeType === 'N' || edgeType === 'S') {
              dy = max - ty
            } else {
              dx = max - tx
            }
          }

          writeMirroredPixel(
            dTileId,
            dx,
            dy,
            color,
          )
        }
      }

      if (isNorth) {
        copyToEdge(
          nEdge.sameEdge,
          'N',
          false,
        )
        copyToEdge(
          nEdge.mirroredEdge,
          'N',
          true,
        )
      }

      if (isSouth) {
        copyToEdge(
          sEdge.sameEdge,
          'S',
          false,
        )
        copyToEdge(
          sEdge.mirroredEdge,
          'S',
          true,
        )
      }

      if (isWest) {
        copyToEdge(
          wEdge.sameEdge,
          'W',
          false,
        )
        copyToEdge(
          wEdge.mirroredEdge,
          'W',
          true,
        )
      }

      if (isEast) {
        copyToEdge(
          eEdge.sameEdge,
          'E',
          false,
        )
        copyToEdge(
          eEdge.mirroredEdge,
          'E',
          true,
        )
      }
    }

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
}