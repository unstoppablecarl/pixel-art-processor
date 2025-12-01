import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import './styles/main.scss'
import { installStepRegistry, makeStepRegistry } from './lib/pipeline/StepRegistry.ts'
import { createPersistedState } from './lib/store/_pinia-persist-plugin.ts'
import { STEP_DATA_TYPES, STEP_DEFINITIONS } from './steps.ts'

const app = createApp(App)
const pinia = createPinia()

pinia.use(createPersistedState())

installStepRegistry(app, makeStepRegistry(STEP_DEFINITIONS, STEP_DATA_TYPES))

app.config.performance = true

app.use(pinia)
app.mount('#app')