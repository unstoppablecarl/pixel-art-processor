<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { drawWangGrid, makeWangGrid } from '../lib/wang-tiles/WangGrid.ts'
import { WangTileset } from '../lib/wang-tiles/WangTileset.ts'

const tileset = WangTileset.createFromColors<string>([
  'red',
  'green',
  'blue',
  'yellow',
])
const grid = makeWangGrid<string>(20, 20, tileset)

const targetCanvas = useTemplateRef('targetCanvas')

onMounted(() => {

  const tileSize = 32
  const sketch = drawWangGrid({
      grid,
      width: 20,
      height: 20,
      tileSize,
      edgeThickness: tileSize * 0.1,
      colorForEdge: (e: string) => {
        console.log(e)
        return e
      }
    },
  )

  if (!targetCanvas.value) return

  targetCanvas.value.width = sketch.width
  targetCanvas.value.height = sketch.height

  const ctx = targetCanvas.value.getContext('2d')!
  ctx.putImageData(sketch.toImageData(), 0, 0)

})

</script>
<template>
  <canvas ref="targetCanvas" />
</template>
