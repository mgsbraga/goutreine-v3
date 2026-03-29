import { useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { navigate } from '../../app/router'
import {
  IconHome,
  IconHistory,
  IconDumbbell,
  IconTrendingUp,
  IconSchemes,
  IconLogout,
  IconMenu,
  IconClose,
} from '../../shared/components/icons'

const navLinks = [
  { label: 'Dashboard',    href: '#/admin',             Icon: IconHome },
  { label: 'Alunos',       href: '#/admin/alunos',      Icon: IconHistory },
  { label: 'Exercícios',   href: '#/admin/exercicios',  Icon: IconDumbbell },
  { label: 'Periodização', href: '#/admin/templates',   Icon: IconTrendingUp },
  { label: 'Esquemas',     href: '#/admin/esquemas',    Icon: IconSchemes },
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
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  async function handleLogout() {
    await logout()
    navigate('login')
  }

  function handleNav(href) {
    const route = href.replace(/^#\/?/, '')
    navigate(route)
    setSidebarOpen(false)
  }

  function SidebarContent({ isCollapsed = false }) {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`border-b border-brand-secondary flex items-center ${isCollapsed ? 'justify-center px-2 py-4' : 'gap-3 px-6 py-5'}`}>
          <img src="/logo.png" alt="Goutreine" className={`object-contain ${isCollapsed ? 'h-8' : 'h-10'}`} />
          {!isCollapsed && <span className="text-xs text-brand-muted uppercase tracking-widest">Admin</span>}
        </div>

        {/* Nav links */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navLinks.map(({ label, href, Icon }) => {
            const active = isNavActive(href)
            return (
              <button
                key={href}
                onClick={() => handleNav(href)}
                className={`w-full flex items-center rounded-lg text-sm transition-colors ${
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  active
                    ? 'bg-brand-green text-brand-dark font-semibold'
                    : 'text-brand-muted hover:text-white hover:bg-brand-secondary font-medium'
                }`}
                aria-current={active ? 'page' : undefined}
                title={isCollapsed ? label : undefined}
              >
                <Icon />
                {!isCollapsed && label}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        {!sidebarOpen && (
          <button
            onClick={toggleCollapsed}
            className="px-4 py-2 text-brand-muted hover:text-white transition-colors text-xs border-t border-b border-brand-secondary flex items-center justify-center gap-2"
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isCollapsed
                ? <><polyline points="9 18 15 12 9 6"/></>
                : <><polyline points="15 18 9 12 15 6"/></>
              }
            </svg>
            {!isCollapsed && 'Recolher'}
          </button>
        )}

        {/* User + logout */}
        <div className={`py-4 border-t border-brand-secondary ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {!isCollapsed && user?.name && (
            <p className="text-sm text-brand-muted mb-3 truncate">{user.name}</p>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center text-brand-muted hover:text-white transition-colors text-sm w-full ${
              isCollapsed ? 'justify-center' : 'gap-2'
            }`}
            title={isCollapsed ? 'Sair' : undefined}
          >
            <IconLogout />
            {!isCollapsed && 'Sair'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white flex">
      {/* Sidebar — desktop */}
      <aside className={`hidden md:flex flex-col bg-brand-card border-r border-brand-secondary shrink-0 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}>
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
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
        {/* Mobile-only top bar: just hamburger + logo */}
        <header className="sticky top-0 z-30 bg-brand-card border-b border-brand-secondary flex items-center px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-brand-muted hover:text-white"
            aria-label="Abrir menu"
          >
            <IconMenu />
          </button>
          <img src="/logo.png" alt="Goutreine" className="h-8 object-contain ml-3" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
