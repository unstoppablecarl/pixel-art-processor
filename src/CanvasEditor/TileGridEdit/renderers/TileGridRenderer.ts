import { makeCanvasFrameRenderer, makeRenderQueue, writePixelData } from 'pixel-data-js'
import { watch } from 'vue'
import { drawText, makePixelCanvas, type PixelCanvas } from '../../../lib/util/html-dom/PixelCanvas.ts'
import { pixelDataRef } from '../../../lib/vue/PixelDataRef.ts'
import type { TileId } from '../../../lib/wang-tiles/WangTileset.ts'
import { useBrushCursor } from '../../_core/data/Brush.ts'
import { type PixelGridLineRenderer } from '../../_core/renderers/PixelGridLineRenderer.ts'
import { makeTileSheetSync } from '../data/TileSync.ts'
import type { TileGridEditorState } from '../TileGridEditorState.ts'
import type { TileGridToolset } from '../TileGridToolset.ts'
import type { TileGridEdgeColorRenderer } from './TileGridEdgeColorRenderer.ts'
import { makeTileRenderer, type TileRenderer } from './TileRenderer.ts'

export type TileGridRenderer = ReturnType<typeof makeTileGridRenderer>

export function makeTileGridRenderer(
  {
    state,
    gridCache,
    tileGridEdgeColorRenderer,
  }: {
    state: TileGridEditorState,
    gridCache: PixelGridLineRenderer,
    tileGridEdgeColorRenderer: TileGridEdgeColorRenderer,
  }) {
  const renderCanvasFrame = makeCanvasFrameRenderer()
  const tileGridPixelDataRef = pixelDataRef()

  const tileSync = makeTileSheetSync(state.tileSheet)

  let toolset: TileGridToolset
  let tileGridPixelCanvas: PixelCanvas | undefined

  const tileRenderers = new Map<TileId, TileRenderer>()

  function setTileGridCanvas(canvas: HTMLCanvasElement) {
    tileGridPixelCanvas = makePixelCanvas(canvas)
    resize()
    queueRenderGrid()
  }

  function registerTileCanvas(tileId: TileId, tileCanvas: HTMLCanvasElement) {
    if (!toolset) throw new Error('currentToolRenderer not set')
    tileRenderers.set(tileId, makeTileRenderer({
        tileId,
        state,
        gridCache,
        tileCanvas,
        toolset,
        tileGridEdgeColorRenderer,
      }),
    )

    queueRenderTile(tileId)
    queueRenderGrid()
  }

  function resize() {
    if (!tileGridPixelCanvas) return
    const scale = state.reactive.scale.value
    const width = state.reactive.tileGridManager.canvasWidth.value * scale
    const height = state.reactive.tileGridManager.canvasHeight.value * scale

    tileGridPixelCanvas.resize(width, height)
    tileGridPixelDataRef.destructiveResize(width, height)

    tileSync.reset()
    for (const [_tileId, tileRenderer] of tileRenderers) {
      tileRenderer.resize()
    }
  }

  function queueRenderTiles(tileIds?: TileId[]) {
    tileRenderers.forEach((tileRenderer, tileId) => {
      if (!tileIds || tileIds.includes(tileId as TileId)) {
        tileRenderer.queueRender()
        queueRenderGrid()
      }
    })
  }

  function queueRenderTile(tileId: TileId) {
    tileRenderers.get(tileId)?.queueRender()
    queueRenderGrid()
  }

  function updateGridTiles() {
    tileGridPixelDataRef.destructiveResize(
      state.reactive.tileGridManager.canvasWidth.value,
      state.reactive.tileGridManager.canvasHeight.value,
    )
    tileSync(state.tileSheet, (tileId) => {
      state.tileGrid.eachWithTileId(tileId, (tileX, tileY, tile) => {
        const tileId = tile.id
        const { gx, gy } = state.tileGridGeometry.gridTileToGridPixel(tileX, tileY)
        const tileImage = state.tileSheet.extractTile(tileId)

        writePixelData(tileGridPixelDataRef.get()!, tileImage, gx, gy)
      })
    })
  }

  const queueRenderGrid = makeRenderQueue(() => {
    updateGridTiles()
    const drawPixelLayer = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
      toolset.currentToolHandler.gridPixelOverlayDraw?.(ctx)
      if (state.reactive.showTileEdgeColors.value) {
        tileGridEdgeColorRenderer.drawGridEdges(ctx)
      }
    }

    const drawScreenLayer = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
      if (state.shouldDrawGrid()) {
        gridCache!.draw(ctx)
      }
      if (state.reactive.showTileIds.value) {
        state.tileGrid.each((tileX, tileY, tile) => {
          const x = tileX * state.tileSize * state.scale
          const y = tileY * state.tileSize * state.scale
          drawText(ctx, tile.id + '', x, y)
        })
      }

      toolset.currentToolHandler.gridScreenOverlayDraw?.(ctx)
    }

    renderCanvasFrame(
      tileGridPixelCanvas!,
      state.scale,
      () => tileGridPixelDataRef?.getImageData(),
      drawPixelLayer,
      drawScreenLayer,
    )
  })

  const brushCursor = useBrushCursor()

  watch([
    state.reactive.scale,
    state.reactive.tileSize,
    state.reactive.tileSheet,
    state.reactive.tileGrid,
    state.reactive.tileGridManager.canvasWidth,
    state.reactive.tileGridManager.canvasHeight,
  ], () => {
    resize()
  })

  watch([
    state.reactive.showTileEdgeColors,
    state.reactive.showTileEdgeColorsOpacity,

    gridCache.watchTarget,

    state.reactive.scale,
    state.reactive.showTileIds,
    state.reactive.tileSize,
    state.reactive.tileSheet,
    state.reactive.tileGrid,
    state.reactive.tileGridManager.canvasWidth,
    state.reactive.tileGridManager.canvasHeight,
    brushCursor.watchTarget,
  ], () => {
    queueRenderTiles()
  })

  return {
    state,
    tileGridPixelDataRef,
    registerTileCanvas,
    setTileGridCanvas,
    gridCache,
    resize,
    queueRenderGrid,
    queueRenderTile,
    queueRenderTiles,
    queueRenderAll: () => queueRenderTiles(),
    setToolset(val: TileGridToolset) {
      toolset = val
    },
    updateGridTiles,
  }
}
