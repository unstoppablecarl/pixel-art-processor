<script setup lang="ts">
import { useStepStore } from '../lib/store/step-store.ts'

const stepStore = useStepStore()

</script>
<template>
  <nav class="navbar navbar-expand fixed-top shadow border-bottom app-header">
    <div class="container-fluid">

      <a class="navbar-brand fw-bold" href="#">
        Pixel Art Processor
      </a>

      <form class="d-flex align-items-center ms-auto gap-3 flex-nowrap">

        <div class="form-group d-flex align-items-center gap-2 mb-0">
          <label class="form-label form-label-sm mb-0 text-nowrap" for="seed">Seed</label>
          <input type="number" id="seed" step="1" v-model.number="stepStore.seed"
                 class="form-control form-control-sm d-inline-block" style="width: 60px" />

        </div>
        <div class="form-group d-flex align-items-center gap-2 mb-0">
          <label
            for="scale"
            class="form-label form-label-sm mb-0 text-nowrap"
            style="width: 50px;"
          >
            Scale: {{ stepStore.imgScale }}
          </label>
          <input type="range"
                 class="form-range form-range-sm"
                 id="scale"
                 min="1"
                 max="10"
                 step="1"
                 style="width: 150px;"
                 v-model.number="stepStore.imgScale"
          >
        </div>
      </form>
    </div>
  </nav>

</template>
<style lang="scss">
.app-header {
  background-color: var(--bs-body-bg);
  border-bottom: 1px solid var(--bs-border-color);
  position: absolute;
}
</style>