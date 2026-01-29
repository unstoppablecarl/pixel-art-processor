export enum Tool {
  BRUSH = 'BRUSH',
  SELECT = 'SELECT'
}

export type DrawLayer = (ctx: CanvasRenderingContext2D, offX?: number, offY?: number) => void

export enum BrushMode {
  ADD = 'ADD',
  REMOVE = 'REMOVE'
}

export enum BlendMode {
  OVERWRITE = 'OVERWRITE',
  IGNORE_TRANSPARENT = 'IGNORE_TRANSPARENT',
  IGNORE_SOLID = 'IGNORE_SOLID'
}

export const DATA_LOCAL_TOOL_ID = 'data-local-tool-id' as const
export const DATA_ATTR_EXCLUDE_SELECT_CANCEL_CLICK = 'data-exclude-select-cancel-click' as const