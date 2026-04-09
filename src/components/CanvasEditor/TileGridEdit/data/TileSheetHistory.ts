import type { Rect } from '../../../../lib/util/data/Rect.ts'
import type { TileId } from '../../../../lib/wang-tiles/WangTileset.ts'


export type TileRect = Rect & { tileId: TileId }
