import { computed, onUnmounted, ref } from 'vue'

const visible = computed(() => sidebarNodeCount.value > 0)
const sidebarNodeCount = ref(0)

export function nodeUsesSidebar() {
  sidebarNodeCount.value++
  onUnmounted(() => {
    sidebarNodeCount.value--
  })
}

export function useSidebar() {
  return {
    visible,
  }
}