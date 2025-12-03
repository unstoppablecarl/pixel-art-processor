import { createBootstrap } from 'bootstrap-vue-next'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import './styles/main.scss'
import { installStepRegistry, makeStepRegistry } from './lib/pipeline/StepRegistry.ts'
import { createPersistedState } from './lib/store/_pinia-persist-plugin.ts'
import { STEP_DATA_TYPES, STEP_DEFINITIONS } from './steps.ts'

const app = createApp(App)
const pinia = createPinia()

const bootstrap = createBootstrap({
  components: {
    BPopover: {
      delay: { show: 100, hide: 0 },
    },
  },
})

pinia.use(createPersistedState())

installStepRegistry(app, makeStepRegistry(STEP_DEFINITIONS, STEP_DATA_TYPES))

app.config.performance = __DEV__

app.use(bootstrap)
app.use(pinia)
app.mount('#app')