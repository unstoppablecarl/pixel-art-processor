<script lang="ts">
import { computed, type Ref } from 'vue'

export type CheckboxColorListItem = {
  label: string,
  active: Ref<boolean>,
  color: Ref<string>,
  defaultColor: string,
}
</script>
<script setup lang="ts">
import CheckboxColor from './CheckboxColor.vue'

const { items } = defineProps<{
  items: CheckboxColorListItem[]
}>()

function reset() {
  items.forEach(i => {
    i.color.value = i.defaultColor
  })
}

function toggleAll() {
  const value = !hasAnyChecked.value
  items.forEach(i => i.active.value = value)
}

const hasAnyChecked = computed(() => items.find(i => i.active.value))
</script>
<template>
  <template v-for="item in items">
    <CheckboxColor
      :label="item.label"
      v-model:active="item.active.value"
      v-model:color="item.color.value"
    />
  </template>

  <button role="button" class="btn btn-sm btn-secondary mt-2" @click="reset()">
    Reset Colors
  </button>
  <button role="button" class="btn btn-sm btn-secondary mt-2 ms-1" @click="toggleAll()">
    <template v-if="hasAnyChecked">
      All Off
    </template>
    <template v-else>
      All On
    </template>
  </button>
</template>
