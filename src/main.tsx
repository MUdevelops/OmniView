import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { useStore } from './core/store'
import { registerFileHandler } from './pwa'
createRoot(document.getElementById('root')!).render(<App />)
registerFileHandler(useStore.getState().add)
if (import.meta.env.PROD) registerSW({ immediate: true })
