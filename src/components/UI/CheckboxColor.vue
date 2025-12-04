<script setup lang="ts">
import { BPopover } from 'bootstrap-vue-next'
import { computed } from 'vue'
import { ChromePicker, tinycolor } from 'vue-color'

const active = defineModel('active')
const color = defineModel<string>('color')

const {
  label,
  bgColor = '#fff',
  check = true,

} = defineProps<{
  label: string,
  bgColor?: string,
  check?: boolean,
}>()

const tinyColorValue = computed({
  get: () => {
    return tinycolor(color.value)
  },
  set(rgba) {
    color.value = tinycolor(rgba).toRgbString()
  },
})

</script>
<template>
  <div class="form-check">
    <input v-if="check" type="checkbox" class="form-check-input" v-model="active" />
    <label class="form-check-label">
      <BPopover click body-class="p-2">
        <template #target>
          <span class="color-indicator" :style="`background: ${bgColor};`">
            <span :style="`background: ${color};`"></span>
          </span>
        </template>

        <ChromePicker v-model.tinycolor="tinyColorValue" />
      </BPopover>
      {{ label }}
    </label>
  </div>
</template>
