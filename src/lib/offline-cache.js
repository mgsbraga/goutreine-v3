const OFFLINE_CACHE_KEY = 'goutreine_offline_data'
const OFFLINE_AUTH_KEY = 'goutreine_offline_auth'

export function persistOfflineCache(data) {
  try {
    const payload = { ...data, cachedAt: new Date().toISOString() }
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(payload))
    console.log('[PWA] Cache offline salvo:', new Date().toLocaleTimeString())
  } catch (err) {
    console.warn('[PWA] Erro ao salvar cache offline:', err)
  }
}

export function restoreOfflineCache() {
  try {
    const cached = localStorage.getItem(OFFLINE_CACHE_KEY)
    if (!cached) {
      console.log('[PWA] Nenhum cache offline encontrado')
      return null
    }
    const data = JSON.parse(cached)
    console.log('[PWA] Cache offline restaurado de:', data.cachedAt)
    return data
  } catch (err) {
    console.warn('[PWA] Erro ao restaurar cache offline:', err)
    return null
  }
}

export function saveOfflineAuth(userId, role, email) {
  try {
    localStorage.setItem(OFFLINE_AUTH_KEY, JSON.stringify({
      userId, role, email, savedAt: new Date().toISOString()
    }))
  } catch (e) { /* silent */ }
}

export function getOfflineAuth() {
  try {
    const auth = localStorage.getItem(OFFLINE_AUTH_KEY)
    return auth ? JSON.parse(auth) : null
  } catch (e) {
    return null
  }
}

export function clearOfflineAuth() {
  try {
    localStorage.removeItem(OFFLINE_AUTH_KEY)
  } catch (e) { /* silent */ }
}
