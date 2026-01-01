<script setup lang="ts">
import { BButton, BPopover } from 'bootstrap-vue-next'

const {
  label,
} = defineProps<{
  label?: string
}>()

const model = defineModel()

function reset(){
  model.value = 0
}
</script>
<template>
  <BPopover
    click
    class="popover-seed"
  >
    <template #target>
      <BButton size="sm" variant="transparent" v-bind="$attrs">
        <span class="material-symbols-outlined">casino</span>
      </BButton>
    </template>

    <div class="input-group">
      <span class="input-group-text">{{ label }} Seed</span>
      <input
        name="seed"
        type="number"
        class="form-control seed-input"
        min="0"
        node="1"
        v-model="model"
      />
      <button
        role="button"
        class="btn btn-outline-secondary"
        @click="reset()"
      >
        <span class="material-symbols-outlined">settings_backup_restore</span>
      </button>
    </div>
  </BPopover>
</template>
