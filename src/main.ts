import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import { createHistory } from '@reddojs/core'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.scss'
import 'vue-color/style.css'
import { installNodeRegistry, makeNodeRegistry } from './lib/pipeline/NodeRegistry.ts'
import { createPersistedState } from './lib/store/_pinia-persist-plugin.ts'
import { CustomAutoAnimationPlugin } from './lib/util/auto-animate.ts'
import { setHistory } from './lib/util/history/history.ts'
import { injectNodeDataTypeCss } from './lib/util/html-dom/css.ts'
import { loadNodeDefinitions, NODE_DATA_TYPE_COLORS, NODE_DATA_TYPES } from './nodes.ts'

const app = createApp(App)
const pinia = createPinia()

pinia.use(createPersistedState())

const stepDefinitions = await loadNodeDefinitions()
installNodeRegistry(makeNodeRegistry(stepDefinitions, NODE_DATA_TYPES))

injectNodeDataTypeCss(NODE_DATA_TYPE_COLORS)

setHistory(createHistory({ size: 100 }))

app.use(autoAnimatePlugin, CustomAutoAnimationPlugin)

app.config.performance = __DEV__

app.use(pinia)
app.mount('#app')