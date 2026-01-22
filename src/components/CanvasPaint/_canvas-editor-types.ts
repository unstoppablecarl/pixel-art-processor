type Shared = {
  onMouseMove: (x: number, y: number) => void,
  onMouseDown: (x: number, y: number) => void,
  onMouseUp: (x: number, y: number) => void,
  onMouseLeave: () => void,
}
export type ToolHandler = Partial<Shared> & {
  onSelectTool?: () => void,
  onUnSelectTool?: () => void,
  pixelOverlayDraw?: (ctx: CanvasRenderingContext2D) => void,
  screenOverlayDraw?: (ctx: CanvasRenderingContext2D) => void,
}

export type ToolManager = Shared & {
  setTool: (tool: Tool) => void,
  currentToolScreenOverlayDraw: (ctx: CanvasRenderingContext2D) => void,
  currentToolPixelOverlayDraw: (ctx: CanvasRenderingContext2D) => void,
}

export enum Tool {
  BRUSH = 'BRUSH',
  SELECT = 'SELECT'
}

export type DrawLayer = (ctx: CanvasRenderingContext2D) => void


