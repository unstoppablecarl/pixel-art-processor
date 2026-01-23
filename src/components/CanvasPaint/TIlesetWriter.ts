import type { Point } from '../../lib/node-data-types/BaseDataStructure.ts'
import type { Direction } from '../../lib/pipeline/_types.ts'
import { getPointsInEdgeMargins, mirrorTilePixelHorizontal, mirrorTilePixelVertical } from '../../lib/util/data/Grid.ts'
import { blendImageDataIgnoreSolid, blendImageDataIgnoreTransparent } from '../../lib/util/html-dom/blit.ts'
import {
  clearImageDataRect,
  type RGBA,
  setImageDataPixelColor,
  setImageDataPixelsColor,
  writeImageData,
} from '../../lib/util/html-dom/ImageData.ts'
import { useDirtyBatching } from '../../lib/vue/batching.ts'
import type { ImageDataRef } from '../../lib/vue/vue-image-data.ts'
import type { AxialEdgeWangTileManager } from '../../lib/wang-tiles/AxialEdgeWangTileManager.ts'
import { type TileId, type WangTile, WangTileset } from '../../lib/wang-tiles/WangTileset.ts'
import type { TilesetImageRefs } from './_canvas-editor-types.ts'
import type { EditorState } from './EditorState.ts'
import type { TileGridRenderer } from './TileGridRenderer.ts'
import { SelectMoveBlendMode } from './tools/select.ts'

export type TilesetWriter = ReturnType<typeof makeTilesetWriter>

export function makeTilesetWriter(
  {
    state,
    tilesetImageRefs,
    tilesetManager,
    gridRenderer,
    onSyncTile,
  }: {
    state: EditorState,
    gridRenderer: TileGridRenderer,
    tilesetImageRefs: TilesetImageRefs,
    tilesetManager: AxialEdgeWangTileManager,
    onSyncTile?: (tile: WangTile<number>, imageData: ImageData) => void,
  }) {

  const { tileset } = tilesetManager

  const { markDirty } = useDirtyBatching<TileId>((dirtyTiles) => {
    for (const tileId of dirtyTiles) {
      syncTile(tileId)
    }
    gridRenderer.queueRender()
  })

  function syncTile(tileId: TileId) {
    const tilesetImageDataRef = tilesetImageRefs[tileId]!
    const imageData = tilesetImageDataRef.get()
    if (!imageData) return

    onSyncTile?.(tileset.value.byId.get(tileId)!, imageData)

    gridRenderer.drawTileToGrid(tileId, imageData)
    gridRenderer.queueRenderTile(tileId)
  }

  return {
    clear() {
      Object.entries(tilesetImageRefs).forEach(([tileId, item]) => {
          item.clearPixels()
          markDirty(tileId as TileId)
        },
      )
    },
    // writeTilePixels(tilePixels: Point[], tileId: TileId, color: RGBA) {
    //   tilePixels.forEach(({ x, y }) => {
    //     const tilesetImageDataRef = tilesetImageRefs[tileId]
    //     const imageData = tilesetImageDataRef.get()!
    //
    //     setImageDataPixelColor(imageData, x, y, color)
    //   })
    //
    //   const affectedTiles = duplicateEdgePixels(
    //     tilesetManager.tileset.value,
    //     state.tileSize,
    //     tilesetImageRefs,
    //     tileId,
    //     tilePixels,
    //     color,
    //     state.tileMarginCopySize,
    //   )
    //
    //   affectedTiles?.forEach(t => markDirty(t.id))
    //   markDirty(tileId)
    // },

    writeGridPixels(gridPixels: Point[], color: RGBA) {
      gridPixels.forEach(({ x, y }) => {
        const tile = tilesetManager.gridPixelToTile(x, y)
        const { x: pixelX, y: pixelY } = state.gridPixelToTilePixel(x, y)!
        if (!tile) return
        const tilesetImageDataRef = tilesetImageRefs[tile.id]!
        const imageData = tilesetImageDataRef.get()
        if (!imageData) return
        setImageDataPixelColor(imageData, pixelX, pixelY, color)

        const affectedTiles = duplicateEdgePixels(
          tilesetManager.tileset.value,
          state.tileSize,
          tilesetImageRefs,
          tile.id,
          [{ x: pixelX, y: pixelY }],
          color,
          state.tileMarginCopySize,
        )

        affectedTiles?.forEach(t => markDirty(t.id))
        markDirty(tile.id)
      })
    },

    clearImageDataRect(
      gx: number,
      gy: number,
      w: number,
      h: number,
    ) {
      const overlapping = tilesetManager.tileGrid.value.getOverlappingTiles({
        x: gx,
        y: gy,
        w,
        h,
      }, state.tileSize)

      for (const { tile, tileOverlap } of overlapping) {
        const target = tilesetImageRefs[tile.id].get()!

        const { x, y, w: tw, h: th } = tileOverlap

        clearImageDataRect(target, x, y, tw, th)
        markDirty(tile.id)
      }
    },
    blendImageData(imageData: ImageData, gx: number, gy: number, blendMode: SelectMoveBlendMode) {
      const overlapping = tilesetManager.tileGrid.value.getOverlappingTiles({
        x: gx,
        y: gy,
        w: imageData.width,
        h: imageData.height,
      }, state.tileSize)

      for (const { tile, tileOverlap, gridOverlap } of overlapping) {
        const target = tilesetImageRefs[tile.id].get()!

        const { x, y } = tileOverlap
        const { x: sx, y: sy, w, h } = gridOverlap

        if (blendMode === SelectMoveBlendMode.OVERWRITE) {
          writeImageData(target, imageData, x, y, sx, sy, w, h)
        } else if (blendMode === SelectMoveBlendMode.IGNORE_TRANSPARENT) {
          blendImageDataIgnoreTransparent(target, imageData, x, y, sx, sy, w, h)
        } else if (blendMode === SelectMoveBlendMode.IGNORE_SOLID) {
          blendImageDataIgnoreSolid(target, imageData, x, y, sx, sy, w, h)
        }
        markDirty(tile.id)
      }

      // 2. Write pixels based on blend mode

      // 3. Duplicate edges
      // const affected = duplicateEdgePixels(
      //   tilesetManager.tileset.value,
      //   state.tileSize,
      //   tilesetImageRefs,
      //   selection.edgePixels,
      //   selection.edgeColor,
      // )
      //
      // // 4. Mark dirty tiles
      // affected?.forEach(t => markDirty(t.id))
    },
  }
}

function duplicateEdgePixels(
  tileset: WangTileset<number>,
  tileSize: number,
  tilesetImageRefs: Record<TileId, ImageDataRef>,
  tileId: TileId,
  pixels: Point[],
  color: RGBA,
  borderThickness: number = 10,
): WangTile<number>[] | undefined {
  const pixelEdges: Record<Direction, Point[]> = {
    N: [],
    S: [],
    E: [],
    W: [],
  }
  const tile = tileset.byId.get(tileId)!

  pixels.forEach(p => getPointsInEdgeMargins(p, tileSize, borderThickness, pixelEdges))

  if (pixelEdges.N.length === 0
    && pixelEdges.S.length === 0
    && pixelEdges.E.length === 0
    && pixelEdges.W.length === 0
  ) return

  let affectedTiles: WangTile<number>[] = []

  Object.entries(pixelEdges).forEach(([e, pixels]) => {
    const edge = e as Direction
    const { sameEdge, mirroredEdge } = tileset.getTilesWithSameEdge(tile, edge)

    affectedTiles = [...affectedTiles, ...sameEdge, ...mirroredEdge]

    sameEdge.forEach(t => {
      const imageData = tilesetImageRefs[t.id].get()!
      setImageDataPixelsColor(imageData, pixels, color)
    })

    mirroredEdge.forEach(t => {
      const imageData = tilesetImageRefs[t.id].get()!

      let mirroredPixels: Point[]
      if (edge === 'N' || edge === 'S') {
        mirroredPixels = pixels.map(p => mirrorTilePixelVertical(p.x, p.y, tileSize))
      } else {
        mirroredPixels = pixels.map(p => mirrorTilePixelHorizontal(p.x, p.y, tileSize))
      }

      setImageDataPixelsColor(imageData, mirroredPixels, color)
    })
  })

  return affectedTiles
}
