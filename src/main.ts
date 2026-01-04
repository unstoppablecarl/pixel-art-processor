import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.scss'
import 'vue-color/style.css'
import { installStepRegistry, makeStepRegistry } from './lib/pipeline/StepRegistry.ts'
import { createPersistedState } from './lib/store/_pinia-persist-plugin.ts'
import { injectNodeDataTypeCss } from './lib/util/misc.ts'
import { loadStepDefinitions, STEP_DATA_TYPE_COLORS, STEP_DATA_TYPES } from './steps.ts'

const app = createApp(App)
const pinia = createPinia()

pinia.use(createPersistedState())

const stepDefinitions = await loadStepDefinitions()
installStepRegistry(makeStepRegistry(stepDefinitions, STEP_DATA_TYPES))

injectNodeDataTypeCss(STEP_DATA_TYPE_COLORS)

app.config.performance = __DEV__

app.use(pinia)
app.mount('#app')