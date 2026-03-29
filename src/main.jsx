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

      // Check for updates — prompts user instead of requiring PWA reinstall
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('Nova versão disponível! Atualizar agora?')) {
                newWorker.postMessage({ type: 'skipWaiting' })
                window.location.reload()
              }
            }
          })
        }
      })
    }).catch((err) => {
      console.error('[SW] Erro no registro:', err)
    })
  })
}
