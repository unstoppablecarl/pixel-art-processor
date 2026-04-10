<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasEditToolStore } from '../../../../lib/store/canvas-edit-tool-store.ts'
import { TOOLS_META } from '../tools-input.ts'

const store = useCanvasEditToolStore()

const currentTool = computed(() => TOOLS_META[store.currentTool].displayName)

const currentSubTool = computed(() => {
  if (!store.currentSubTool) return
  const subTools = TOOLS_META[store.currentTool].subTools
  if (!subTools) return
  return subTools[store.currentSubTool]?.displayName
})

const currentKeys = computed(() => {
  return TOOLS_META[store.currentTool].keyBindings
})

const currentModifiers = computed(() => {
  return TOOLS_META[store.currentTool].modifierKeyBindings
})
</script>
<template>
  <nav class="navbar navbar-expand fixed-bottom shadow border-bottom canvas-paint-footer">
    <div class="inner">
      <span class="btn-sm-py">
        <span class="text-muted me-2">Tool</span>
        <strong>{{ currentTool }}</strong>
        <template v-if="currentSubTool">: {{ currentSubTool }}</template>
      </span>

      <span class="btn-sm-py inner-divider text-muted" v-if="currentKeys.length">
        Keys
      </span>

      <template v-for="k in currentKeys">
        <span class="btn btn-sm btn-transparent disabled ms-3 fw-bold">{{ k.key }}</span>
        <span class="btn-sm-py text-muted ms-1"> {{ k.description }}</span>
      </template>


      <span class="btn-sm-py inner-divider text-muted" v-if="currentModifiers.length">
        modifiers
      </span>
      <template v-for="k in currentModifiers">
        <span class="btn btn-sm btn-transparent disabled ms-3 fw-bold">default</span>
        <span class="btn-sm-py text-muted ms-1"> {{ k.upDescription}}</span>

        <span class="btn btn-sm btn-transparent disabled ms-3 fw-bold">{{ k.downKey }}</span>
        <span class="btn-sm-py text-muted ms-1"> {{ k.downDescription}}</span>
      </template>
    </div>
  </nav>
</template>
<style lang="scss">
.navbar.canvas-paint-footer {
  background-color: var(--bs-body-bg);
  border-top: 1px solid var(--bs-border-color);
  height: var(--app-footer-height);
  transition: transform var(--sidebar-transition-time) ease-in-out;
  transform: translateY(100%);
  padding: 3px 0;

  font-size: 0.75rem;

  .inner {
    padding: 0 8px;

    .inner-divider {
      margin-left: 1rem;
      padding-left: 1rem;
      border-left: 1px solid var(--bs-border-color);
    }

    .btn-transparent {
      border: 1px solid rgba(255, 255, 255, 0.1);
      opacity: 1;
    }
  }
}

.canvas-edit-visible .canvas-paint-footer {
  transform: translateY(0%);
}
</style>