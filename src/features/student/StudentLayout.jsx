import React, { useMemo } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { navigate } from '../../app/router'
import { store } from '../../shared/constants/store'
import { getActivePhase } from '../../shared/utils/phase-helpers'
import {
  IconHome,
  IconDumbbell,
  IconCalendar,
  IconHistory,
  IconTrendingUp,
  IconLogout,
} from '../../shared/components/icons'

const navItems = [
  { route: 'dashboard',  label: 'Home',       icon: <IconHome /> },
  { route: 'treino',     label: 'Treino',      icon: <IconDumbbell /> },
  { route: 'calendario', label: 'Calendário',  icon: <IconCalendar /> },
  { route: 'historico',  label: 'Histórico',   icon: <IconHistory /> },
  { route: 'progresso',  label: 'Progresso',   icon: <IconTrendingUp /> },
]

const isActive = (route) => window.location.hash.includes(`#${route}`)

export default function StudentLayout({ children }) {
  const { user, logout, pendingSync, syncMessage, trySync } = useAuth()
  const [syncing, setSyncing] = React.useState(false)

  async function handleManualSync() {
    setSyncing(true)
    try {
      await trySync()
    } finally {
      setSyncing(false)
    }
  }

  // Detect workout-in-progress across all plans
  const wipInfo = useMemo(() => {
    if (!user?.id) return null
    // Don't show banner if we're already on the ExecutarTreino page
    if (window.location.hash.includes('executar')) return null
    const phase = getActivePhase(user.id)
    if (!phase) return null
    const plans = store.training_plans.filter(p => p.phase_id === phase.id)
    for (const plan of plans) {
      try {
        const raw = localStorage.getItem(`goutreine_wip_${plan.id}`)
        if (raw) {
          const wip = JSON.parse(raw)
          if (wip.userId === user.id && (Date.now() - wip.savedAt) < 4 * 60 * 60 * 1000) {
            return { plan, setsCompleted: Object.keys(wip.setLogs || {}).length }
          }
        }
      } catch {}
    }
    return null
  }, [user?.id, window.location.hash])

  function discardWIP(planId) {
    try { localStorage.removeItem(`goutreine_wip_${planId}`) } catch {}
    window.location.reload()
  }

  async function handleLogout() {
    await logout()
    navigate('login')
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white flex flex-col pb-24">
      {/* Top header bar */}
      <header className="safe-top bg-brand-card border-b border-brand-secondary flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <img src="/logo.png" alt="Goutreine" className="h-10 object-contain" />

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ route, label }) => (
            <button
              key={route}
              onClick={() => navigate(route)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(route)
                  ? 'bg-brand-green bg-opacity-20 text-brand-green'
                  : 'text-brand-muted hover:text-white hover:bg-brand-secondary'
              }`}
              aria-current={isActive(route) ? 'page' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* User name + logout */}
        <div className="flex items-center gap-3">
          {user?.name && (
            <span className="text-sm text-brand-muted hidden sm:block">{user.name}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-brand-muted hover:text-white transition-colors text-sm"
            aria-label="Sair"
          >
            <IconLogout />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Sync toast */}
      {syncMessage && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
          syncMessage.includes('Falha')
            ? 'bg-red-500 text-white'
            : 'bg-brand-green text-brand-dark'
        }`}>
          {syncMessage}
        </div>
      )}

      {/* Pending sync banner */}
      {pendingSync > 0 && (
        <div className="bg-yellow-500/15 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-center gap-3 text-xs text-yellow-400">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>{pendingSync} treino{pendingSync > 1 ? 's' : ''} pendente{pendingSync > 1 ? 's' : ''}</span>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-3 py-1 rounded-md font-semibold transition-colors disabled:opacity-50"
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
          </button>
        </div>
      )}

      {/* Workout-in-progress banner */}
      {wipInfo && (
        <div className="bg-brand-green/10 border-b border-brand-green/30 px-4 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A4E44B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">{wipInfo.plan.name} em andamento</p>
            <p className="text-[10px] text-brand-muted">{wipInfo.setsCompleted} série{wipInfo.setsCompleted !== 1 ? 's' : ''} feita{wipInfo.setsCompleted !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => discardWIP(wipInfo.plan.id)}
            className="text-[10px] text-brand-muted hover:text-red-400 px-2 py-1 transition-colors shrink-0"
          >
            Descartar
          </button>
          <button
            onClick={() => navigate(`executar/${wipInfo.plan.id}`)}
            className="text-xs bg-brand-green text-brand-dark px-3 py-1.5 rounded-lg font-semibold shrink-0"
          >
            Continuar
          </button>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav className="safe-bottom fixed bottom-0 left-0 right-0 bg-brand-card border-t border-brand-secondary md:hidden">
        <div className="flex justify-center">
          {navItems.map(({ route, label, icon }) => (
            <button
              key={route}
              onClick={() => navigate(route)}
              className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${
                isActive(route) ? 'tab-active' : 'tab-inactive hover:text-white'
              }`}
              aria-label={label}
              aria-current={isActive(route) ? 'page' : undefined}
            >
              <span className="w-5 h-5">
                {React.cloneElement(icon, { className: 'w-5 h-5' })}
              </span>
              <span className="text-[10px] leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
