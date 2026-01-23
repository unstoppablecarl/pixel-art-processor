// import { makeCopyPasteKeys } from '../../../lib/util/html-dom/keyboard.ts'
// import { type Selection, Tool, type ToolHandler } from '../_canvas-editor-types.ts'
// import type { EditorState } from '../EditorState.ts'
//
// import type { GlobalToolContext } from '../GlobalToolManager.ts'
// import type { TileGridRenderer } from '../TileGridRenderer.ts'
// import type { TilesetWriter } from '../TIlesetWriter.ts'
//
export enum SelectMoveBlendMode {
  OVERWRITE = 'OVERWRITE',
  IGNORE_TRANSPARENT = 'IGNORE_TRANSPARENT',
  IGNORE_SOLID = 'IGNORE_SOLID'
}

// let clipboard: ImageData | undefined
//
// export function makeSelectTool(toolContext: GlobalToolContext): ToolHandler {
//
//   function commit(
//     state: EditorState,
//     gridRenderer: TileGridRenderer,
//     tilesetWriter: TilesetWriter,
//   ) {
//     const sel = state.selectionData
//     if (!sel?.pixels) return
//
//     if (sel.w && sel.h) {
//       tilesetWriter.clearImageDataRect(sel.origX, sel.origY, sel.origW, sel.origH)
//       const mode = toolContext.selectMoveBlendMode
//       tilesetWriter.blendImageData(sel.pixels, sel.x, sel.y, mode)
//     }
//
//     state.selecting = false
//     state.selectionData = null
//     gridRenderer.queueRender()
//   }
//
//   return {
//     inputBindings: makeCopyPasteKeys(({ state, tilesetToolState }) => {
//       const sel = tilesetToolState.selection
//       if (!sel?.pixels) return
//       clipboard = sel.pixels
//     }, () => {
//     }),
//     onGlobalToolChanging({ state, gridRenderer, tilesetWriter }, oldTool, newTool) {
//       if (oldTool === Tool.SELECT && state.selectionData) {
//         commit(state, gridRenderer, tilesetWriter)
//       }
//     },
//     onDragStart({ state, tilesetToolState, gridRenderer }, tx, ty) {
//       const ts = tilesetToolState
//       const sel = ts.selection
//
//       if (!sel) {
//         ts.startSelection(tx, ty)
//         return
//       }
//
//       if (clickedSelection(tx, ty, sel)) {
//         ts.dragging.value = true
//         sel.offsetX = tx - sel.x
//         sel.offsetY = ty - sel.y
//         return
//       }
//
//       ts.startSelection(tx, ty)
//       gridRenderer.queueRender()
//     },
//         onDragMove({ state, tilesetToolState, gridRenderer }, tx, ty) {
//           const ts = tilesetToolState
//           const sel = ts.selection
//           if (!sel) return
//
//           if (ts.dragging.value) {
//             ts.moveSelection(tx, ty)
//           } else if (ts.selecting.value) {
//             ts.updateSelection(tx, ty)
//           }
//
//           gridRenderer.queueRender()
//         },
//
//         onDragEnd({ state, tilesetToolState, gridRenderer }) {
//           const ts = tilesetToolState
//           const sel = ts.selection
//           if (!sel) return
//
//           if (ts.selecting.value) {
//             ts.extractSelectionPixels(state.tileImageDataRefs)
//             ts.selecting.value = false
//           }
//
//           ts.dragging.value = false
//           gridRenderer.queueRender()
//         },
//
//     //     onDeselect({ state, tilesetToolState, renderer })
//     //     {
//     //       const ts = tilesetToolState
//     //       ts.commitSelection(
//     //         state.tilesetImageRefs,
//     //         state.duplicateEdgePixels,
//     //         state.markDirty,
//     //       )
//     //       renderer.queueRender()
//     //     },
//     //
//     //     pixelOverlayDraw({ tilesetToolState, projection }, ctx)
//     //     {
//     //       const sel = tilesetToolState.selection
//     //       if (!sel || !sel.pixels) return
//     //
//     //       const origTL = projection.tilesetToCanvas(sel.origX, sel.origY)
//     //       const origBR = projection.tilesetToCanvas(sel.origX + sel.origW, sel.origY + sel.origH)
//     //       const origW = origBR.x - origTL.x
//     //       const origH = origBR.y - origTL.y
//     //
//     //       if (sel.x !== sel.origX || sel.y !== sel.origY) {
//     //         ctx.clearRect(origTL.x, origTL.y, origW, origH)
//     //       }
//     //
//     //       const curTL = projection.tilesetToCanvas(sel.x, sel.y)
//     //       const curBR = projection.tilesetToCanvas(sel.x + sel.w, sel.y + sel.h)
//     //       const curW = curBR.x - curTL.x
//     //       const curH = curBR.y - curTL.y
//     //
//     //       const mode = toolContext.selectMoveBlendMode
//     //       if (mode === SelectMoveBlendMode.OVERWRITE) {
//     //         ctx.clearRect(curTL.x, curTL.y, curW, curH)
//     //         putImageDataScaled(ctx, curW, curH, sel.pixels, curTL.x, curTL.y)
//     //       } else if (mode === SelectMoveBlendMode.IGNORE_TRANSPARENT) {
//     //         putImageDataScaled(ctx, curW, curH, sel.pixels, curTL.x, curTL.y, blendIgnoreTransparent)
//     //       } else if (mode === SelectMoveBlendMode.IGNORE_SOLID) {
//     //         putImageDataScaled(ctx, curW, curH, sel.pixels, curTL.x, curTL.y, blendSourceAlphaOver(0.5))
//     //       }
//     //     },
//     //
//     //     screenOverlayDraw({ state, tilesetToolState, projection }, ctx) {
//     //       const sel = tilesetToolState.selection
//     //       if (!sel) return
//     //
//     //       const tl = projection.tilesetToCanvas(sel.x, sel.y)
//     //       const br = projection.tilesetToCanvas(sel.x + sel.w, sel.y + sel.h)
//     //       const w = br.x - tl.x
//     //       const h = br.y - tl.y
//     //
//     //       ctx.strokeStyle = 'cyan'
//     //       ctx.lineWidth = 1
//     //       ctx.strokeRect(
//     //         tl.x * state.scale - 0.5,
//     //         tl.y * state.scale - 0.5,
//     //         w * state.scale + 2,
//     //         h * state.scale + 2,
//     //       )
//     //     },
//     //   },
//     // }
//   }
//
//   const clickedSelection = (x: number, y: number, sel: Selection | null): boolean => {
//     if (!sel) return false
//     return x >= sel.x
//       && x < sel.x + sel.w
//       && y >= sel.y
//       && y < sel.y + sel.h
//   }