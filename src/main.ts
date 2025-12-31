import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import './styles/main.scss'
import 'vue-color/style.css'
import { createPersistedState } from './lib/store/_pinia-persist-plugin.ts'

const app = createApp(App)
const pinia = createPinia()

pinia.use(createPersistedState())

app.config.performance = __DEV__

app.use(pinia)
app.mount('#app')