<script setup lang="ts">
import { useSidebar } from '../../lib/vue/useSidebar.ts'

const { visible } = useSidebar()

</script>
<template>
  <div :class="{
    'canvas-paint-sidebar shadow-sm': true,

  }">
    Test
  </div>

  <div class="tester">

    {{ visible }}
    <button role="button" class="btn btn-secondary" @click="visible = !visible">Test</button>
  </div>
</template>
<style>
.canvas-paint-sidebar {
  width: var(--canvas-paint-sidebar-width);
  --bs-bg-opacity: 1;
  background-color: rgba(var(--bs-dark-rgb), var(--bs-bg-opacity)) !important;
  top: var(--navbar-height);
  height: 300px;
  left: 0;
  position: fixed;
  z-index: 20;
  border-radius: 0 0 var(--bs-border-radius) 0;
  transition: transform var(--sidebar-transition-time) ease-in-out;
  transform: translateX(-100%);
}

.sidebar-visible .canvas-paint-sidebar {
  transform: translateX(0%);
}

.tester {
  width: var(--canvas-paint-sidebar-width);
  --bs-bg-opacity: 1;
  background-color: rgba(var(--bs-dark-rgb), var(--bs-bg-opacity)) !important;
  bottom: 0;
  height: 100px;
  left: 0;
  position: fixed;
  z-index: 30;
}
</style>