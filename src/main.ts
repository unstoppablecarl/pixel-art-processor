import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import './styles/main.scss'
import 'vue-color/style.css'
import { installStepRegistry, makeStepRegistry } from './lib/pipeline/StepRegistry.ts'
import { createPersistedState } from './lib/store/_pinia-persist-plugin.ts'
import { STEP_DATA_TYPES, STEP_DEFINITIONS } from './steps.ts'

const app = createApp(App)
const pinia = createPinia()

pinia.use(createPersistedState())

installStepRegistry(app, makeStepRegistry(STEP_DEFINITIONS, STEP_DATA_TYPES))

app.config.performance = __DEV__

app.use(pinia)
app.mount('#app')