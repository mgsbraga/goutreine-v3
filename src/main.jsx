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

      // Force check for updates every time the app loads
      reg.update().catch(() => {})

      // Check for updates — auto-activate new SW
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Auto-activate new version without asking
              newWorker.postMessage('skipWaiting')
              window.location.reload()
            }
          })
        }
      })
    }).catch((err) => {
      console.error('[SW] Erro no registro:', err)
    })
  })

  // Listen for SW controller change (when new SW takes over)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Nova versão ativada')
  })
}
