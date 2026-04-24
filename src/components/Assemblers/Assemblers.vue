<script setup lang="ts">
import { computed } from 'vue'
import { usePreviewStore } from '../../lib/store/preview-store.ts'
import { ASSEMBLER_REGISTRY, type AssemblerId } from '../../lib/vue/assembler-registry.ts'

const previewStore = usePreviewStore()

const assemblers = computed(() => Object.entries(ASSEMBLER_REGISTRY).map(([key, value]) => {
  return {
    id: key as AssemblerId,
    name: value.name,
    comp: () => value.comp,
    active: previewStore.assemblers[key as AssemblerId],
  }
}))

function setActive(id: AssemblerId, value: boolean) {
  previewStore.assemblers[id] = value
}

</script>
<template>
  <div class="assemblers pb-1" v-for="item in assemblers">
    <button role="button" class="btn btn-secondary" v-if="!item.active" @click="setActive(item.id,true)">
      Add {{ item.name }}
    </button>

    <Component v-if="item.active" :is="item.comp()">
      <template #after>
        <button role="button" class="btn btn-secondary" v-if="item.active" @click="setActive(item.id, false)">
          Remove
        </button>
      </template>
    </Component>
  </div>
</template>
<style lang="scss">
.assemblers {
  margin: 0 var(--node-card-margin) 0;
  padding-left: 1rem;
}
</style>