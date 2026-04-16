import WangTileBitMaskDrawAssembler from '../../components/Assemblers/WangTileBitMaskDrawAssembler.vue'
import WangTileBitMaskForkAssembler from '../../components/Assemblers/WangTileBitMaskForkAssembler.vue'
import { NODE_WANG_TILE_BIT_MASK_DRAW_DISPLAY_NAME } from '../../components/Node/WangTile/WangTileBitMaskDraw.vue'
import { NODE_WANG_TILE_FORK_DISPLAY_NAME } from '../../components/Node/WangTile/WangTileFork.vue'

export type AssemblerId = keyof typeof ASSEMBLER_REGISTRY
export const ASSEMBLER_REGISTRY = {
  WangTileBitMaskForkAssembler: {
    name: NODE_WANG_TILE_FORK_DISPLAY_NAME + ' Assembler',
    comp: WangTileBitMaskForkAssembler,
  },
  WangTileBitMaskDrawAssembler: {
    name: NODE_WANG_TILE_BIT_MASK_DRAW_DISPLAY_NAME + ' Assembler',
    comp: WangTileBitMaskDrawAssembler,
  },
}