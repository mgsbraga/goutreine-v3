import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { sb } from '../lib/supabase'
import { isConfigured } from '../lib/supabase'
import * as authService from '../services/auth'
import { loadSupabaseCache } from '../services/cache'
import { saveOfflineAuth, clearOfflineAuth, getOfflineQueue } from '../lib/offline-cache'
import { syncOfflineQueue } from '../services/workouts'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [pendingSync, setPendingSync] = useState(() => getOfflineQueue().length)
  const [syncMessage, setSyncMessage] = useState(null)
  const userRef = useRef(null)

  const trySync = useCallback(async () => {
    const queue = getOfflineQueue()
    setPendingSync(queue.length)
    if (queue.length === 0) return
    const result = await syncOfflineQueue()
    setPendingSync(getOfflineQueue().length)
    if (result.synced > 0) {
      setSyncMessage(`${result.synced} treino${result.synced > 1 ? 's' : ''} sincronizado${result.synced > 1 ? 's' : ''}`)
      setTimeout(() => setSyncMessage(null), 4000)
    }
  }, [])

  // Sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync] Conexão restaurada, sincronizando...')
      trySync()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [trySync])

  const restoreSession = useCallback(async (sessionUser) => {
    if (userRef.current) return
    try {
      const profile = await Promise.race([
        authService.getProfile(sessionUser.id),
        new Promise((_, rej) => setTimeout(() => rej(new Error('getProfile timeout')), 8000)),
      ])
      if (!profile) throw new Error('Perfil não encontrado')

      const user = { id: sessionUser.id, email: sessionUser.email, name: profile.name, role: profile.role }
      userRef.current = user
      setCurrentUser(user)
      saveOfflineAuth(user.id, user.role, user.email)

      setDataLoading(true)
      await Promise.race([
        loadSupabaseCache(user.id, user.role),
        new Promise((resolve) => setTimeout(resolve, 10000)),
      ])
      setDataLoading(false)

      // Sync any pending offline writes after data loads
      trySync()
    } catch (e) {
      console.error('[Auth] Erro ao restaurar sessao:', e)
      setDataLoading(false)
    }
  }, [trySync])

  useEffect(() => {
    if (!sb) { setAuthChecked(true); return }

    let mounted = true

    const authTimeout = setTimeout(() => {
      if (mounted && !userRef.current) {
        console.warn('[Auth] getSession timeout — liberando app')
        setAuthChecked(true)
      }
    }, 6000)

    sb.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(authTimeout)
      if (!mounted) return
      if (session?.user) await restoreSession(session.user)
      if (mounted) setAuthChecked(true)
    }).catch((e) => {
      clearTimeout(authTimeout)
      console.error('[Auth] getSession error:', e)
      if (mounted) setAuthChecked(true)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_IN' && session?.user) {
        await restoreSession(session.user)
      } else if (event === 'SIGNED_OUT') {
        userRef.current = null
        setCurrentUser(null)
        clearOfflineAuth()
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [restoreSession])

  const login = useCallback(async (email, password) => {
    const data = await authService.signIn(email, password)
    if (!data?.user) throw new Error('Login falhou')

    const profile = await authService.getProfile(data.user.id)
    const user = { id: data.user.id, email: data.user.email, name: profile.name, role: profile.role }
    userRef.current = user
    saveOfflineAuth(user.id, user.role, user.email)

    if (isConfigured) {
      setDataLoading(true)
      await loadSupabaseCache(user.id, user.role)
      setDataLoading(false)
    }

    setCurrentUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    await authService.signOut()
    userRef.current = null
    setCurrentUser(null)
    clearOfflineAuth()
  }, [])

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      role: currentUser?.role || null,
      isAdmin: currentUser?.role === 'admin',
      isStudent: currentUser?.role === 'student',
      authChecked,
      dataLoading,
      login,
      logout,
      pendingSync,
      syncMessage,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
