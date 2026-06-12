import 'element-plus/dist/index.css'
import './style.css'

import { i18n } from '@mlightcad/cad-viewer'
import { createApp } from 'vue'

import App from './App.vue'

const app = createApp(App)
app.use(i18n)
app.mount('#app')

// Hide the index.html loading spinner once Vue has mounted
const loader = document.getElementById('loader')
if (loader) {
  loader.style.display = 'none'
}
