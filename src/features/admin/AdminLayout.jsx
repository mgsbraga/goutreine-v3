import { useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { navigate } from '../../app/router'
import {
  IconHome,
  IconHistory,
  IconDumbbell,
  IconTrendingUp,
  IconLogout,
  IconMenu,
  IconClose,
} from '../../shared/components/icons'

const navLinks = [
  { label: 'Dashboard',    href: '#/admin',             Icon: IconHome },
  { label: 'Alunos',       href: '#/admin/alunos',      Icon: IconHistory },
  { label: 'Exercícios',   href: '#/admin/exercicios',  Icon: IconDumbbell },
  { label: 'Periodização', href: '#/admin/templates',   Icon: IconTrendingUp },
]

function isNavActive(href) {
  const hash = window.location.hash
  if (href === '#/admin') {
    return hash === '#/admin' || hash === '#admin' || hash === '#/admin/dashboard' || hash === ''
  }
  const clean = href.replace(/^#\/?/, '')
  return hash.includes(clean)
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('login')
  }

  function handleNav(href) {
    const route = href.replace(/^#\/?/, '')
    navigate(route)
    setSidebarOpen(false)
  }

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-brand-secondary flex items-center gap-3">
          <img src="/logo.png" alt="Goutreine" className="h-10 object-contain" />
          <span className="text-xs text-brand-muted uppercase tracking-widest">Admin</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map(({ label, href, Icon }) => {
            const active = isNavActive(href)
            return (
              <button
                key={href}
                onClick={() => handleNav(href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-brand-green text-brand-dark font-semibold'
                    : 'text-brand-muted hover:text-white hover:bg-brand-secondary font-medium'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon />
                {label}
              </button>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-brand-secondary">
          {user?.name && (
            <p className="text-sm text-brand-muted mb-3 truncate">{user.name}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-brand-muted hover:text-white transition-colors text-sm w-full"
          >
            <IconLogout />
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-card border-r border-brand-secondary shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="relative z-50 flex flex-col w-64 bg-brand-card border-r border-brand-secondary">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 text-brand-muted hover:text-white p-1"
              aria-label="Fechar menu"
            >
              <IconClose />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav bar (sticky, visible on all screen sizes) */}
        <header className="sticky top-0 z-30 bg-brand-card border-b border-brand-secondary flex items-center justify-between px-4 py-3">
          {/* Left: hamburger (mobile) + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-brand-muted hover:text-white"
              aria-label="Abrir menu"
            >
              <IconMenu />
            </button>
            <img src="/logo.png" alt="Goutreine" className="h-10 object-contain md:hidden" />
          </div>

          {/* Right: user name + logout */}
          <div className="flex items-center gap-3 ml-auto">
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
      </div>
    </div>
  )
}
