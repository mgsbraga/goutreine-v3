import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/index.css'

// Hide CSS-only loading skeleton
const loader = document.getElementById('app-loader')
if (loader) loader.classList.add('hide')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[SW] Registrado:', reg.scope)
      // Force check for SW updates on every load
      reg.update().catch(() => {})
    }).catch((err) => {
      console.error('[SW] Erro no registro:', err)
    })
  })

  // When the new SW sends SW_UPDATED message, reload to get fresh code
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      console.log('[SW] Nova versão detectada:', event.data.version, '— recarregando')
      window.location.reload()
    }
  })

  // Also reload when controller changes (new SW takes over)
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    console.log('[SW] Controller mudou — recarregando')
    window.location.reload()
  })
}
