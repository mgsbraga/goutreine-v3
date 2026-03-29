import React from 'react'
import { useAuth } from '../../contexts/auth-context'
import { navigate } from '../../app/router'
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
  const { user, logout } = useAuth()

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
