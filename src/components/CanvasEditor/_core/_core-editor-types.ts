import { type Ref, type ShallowRef } from 'vue'
import type { BrushToolState } from './tools/BrushToolState.ts'

export const TOOL_HOVER_CSS_CLASSES: Record<Tool, string> = {
  BRUSH: 'brush',
  SELECT: 'select',
}

export enum Tool {
  BRUSH = 'BRUSH',
  SELECT = 'SELECT'
}

export enum BrushSubTool {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}

export enum SelectSubTool {
  RECT = 'RECT',
  FLOOD = 'FLOOD'
}

type SubToolMap = {
  [Tool.SELECT]: SelectSubTool,
  [Tool.BRUSH]: BrushSubTool,
}

export const SubTools = {
  [Tool.SELECT]: SelectSubTool,
  [Tool.BRUSH]: BrushSubTool,
} as const

export type AnySubTool = SubToolOf<Tool>
export type SubToolOf<T extends Tool> =
  T extends keyof SubToolMap ? SubToolMap[T] : null

export type DrawLayer = (ctx: CanvasRenderingContext2D, offX?: number, offY?: number) => void

export enum BrushShape {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE'
}

export enum BlendMode {
  OVERWRITE = 'OVERWRITE',
  IGNORE_TRANSPARENT = 'IGNORE_TRANSPARENT',
  IGNORE_SOLID = 'IGNORE_SOLID'
}

export const DATA_LOCAL_TOOL_ID = 'data-local-tool-id' as const
export const DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK = 'data-exclude-select-cancel-click' as const

export interface BaseEditorState {
  id: string,
  scale: number,

  mouseX: number | null,
  mouseY: number | null,

  mouseLastX: number | null,
  mouseLastY: number | null,

  mouseDownX: number | null,
  mouseDownY: number | null,

  mouseDragStartX: number | null,
  mouseDragStartY: number | null,
  isDragging: boolean,
  dragThreshold: number,

  shouldDrawGrid(): boolean
}

export type ToolInputHandlers = {
  handleMouseDown: (e: MouseEvent) => void,
  handleMouseMove: (e: MouseEvent) => void,
  handleMouseLeave: (e: MouseEvent) => void,
  handleMouseEnter: (e: MouseEvent) => void,
}

export type BaseToolController<TArgs extends any[] = []> = {
  id: string,
  getInputHandlers: (canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>, ...args: TArgs) => ToolInputHandlers & {
    currentCursorCssClass: Ref<string | null>
  },
}

export type InputTarget = {
  getCoordsFromEvent(e: MouseEvent): { x: number, y: number }
  onMouseDown(x: number, y: number, e: MouseEvent): void
  onMouseMove(x: number, y: number, e: MouseEvent): void
  onMouseUp(x: number, y: number, e: MouseEvent): void
  onMouseLeave?(e: MouseEvent): void,
  onMouseEnter?(e: MouseEvent): void,
  onHoverStart?(e: MouseEvent): void
  onHoverEnd?(e: MouseEvent): void,

  onCopy?(): void,
  onPaste?(): void,
}

export type BaseToolHandler<S, TArgs extends any[] = []> = {
  toolState: S,
  onMouseMove?: (x: number, y: number, ...args: TArgs) => void,
  onMouseDown?: (x: number, y: number, ...args: TArgs) => void,
  onMouseUp?: (x: number, y: number, ...args: TArgs) => void,
  onMouseLeave?: (...args: TArgs) => void,

  onDragStart?: (x: number, y: number, ...args: TArgs) => void,
  onDragMove?: (x: number, y: number, ...args: TArgs) => void,
  onDragEnd?: (x: number, y: number, ...args: TArgs) => void,
  onClick?: (x: number, y: number, ...args: TArgs) => void,
  onDocumentClick?: (target: HTMLElement, event: MouseEvent) => void,

  onSelect?: () => void,
  onDeselect?: () => void,

  cursorCssClass?: (() => string | null) | string,

  onCopy?: () => void,
  onPaste?: () => void
}

export type ToolHandlerSubToolChanged<T extends string> = {
  onSubToolChanged?: (newSubTool: T) => void,
}

export type ToolHandlersRecord<TArgs extends any[] = []> = {
  [Tool.SELECT]: BaseSelectToolHandler<any, TArgs>,
  [Tool.BRUSH]: BaseToolHandler<any, TArgs>,
}

export const defineToolController = <TArgs extends any[]>() =>
  <T extends BaseToolController<TArgs>>(toolset: T) => toolset

export type BaseToolManagerSettings = {
  id: string,
  scale?: Ref<number>,
  gridColor: Ref<string>,
  gridDraw: Ref<boolean>
}

export type BaseSelectToolState = {
  clearSelection(): void
}

export type BaseSelectToolHandler<S extends BaseSelectToolState, TArgs extends any[] = []> =
  & BaseToolHandler<S, TArgs>
  & ToolHandlerSubToolChanged<SelectSubTool>

export type BaseBrushToolHandler<TArgs extends any[] = []> =
  & BaseToolHandler<BrushToolState, TArgs>
  & ToolHandlerSubToolChanged<BrushSubTool>
