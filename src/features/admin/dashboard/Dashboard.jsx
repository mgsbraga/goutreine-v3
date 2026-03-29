import { useState } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
import { sb } from '../../../lib/supabase'
import { store } from '../../../shared/constants/store'
import AdminLayout from '../AdminLayout'

function StatCard({ label, value, color = 'text-brand-green' }) {
  return (
    <div className="bg-brand-card border border-brand-secondary rounded-xl p-5">
      <p className="text-brand-muted text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function QuickLink({ label, description, route }) {
  return (
    <button
      onClick={() => navigate(route)}
      className="w-full text-left bg-brand-card border border-brand-secondary rounded-xl p-5 hover:border-brand-green transition-colors group"
    >
      <p className="font-semibold text-white group-hover:text-brand-green transition-colors">{label}</p>
      {description && <p className="text-brand-muted text-sm mt-1">{description}</p>}
    </button>
  )
}

function ResetProgressButton() {
  const [resetting, setResetting] = useState(false)
  const [result, setResult] = useState(null)

  async function handleReset() {
    if (!confirm('⚠️ ATENÇÃO: Isso vai EXCLUIR todos os registros de treinos executados, logs de exercícios e dados de progresso de TODOS os alunos.\n\nEssa ação NÃO pode ser desfeita.\n\nDigite "RESETAR" para confirmar:')) return
    const confirmation = prompt('Digite RESETAR para confirmar:')
    if (confirmation !== 'RESETAR') {
      alert('Reset cancelado.')
      return
    }

    setResetting(true)
    setResult(null)
    const log = []

    try {
      if (sb) {
        // 1. Delete all session_logs
        const { error: e1, count: c1 } = await sb.from('session_logs').delete().neq('id', 0)
        log.push(e1 ? `❌ session_logs: ${e1.message}` : `✅ session_logs deletados`)

        // 2. Delete all workout_sessions
        const { error: e2, count: c2 } = await sb.from('workout_sessions').delete().neq('id', 0)
        log.push(e2 ? `❌ workout_sessions: ${e2.message}` : `✅ workout_sessions deletados`)
      }

      // 3. Clear local store
      store.workout_sessions = []
      store.session_logs = []
      log.push('✅ Cache local limpo')

      // 4. Clear offline queue
      try {
        localStorage.removeItem('goutreine_offline_queue')
        localStorage.removeItem('goutreine_offline_data')
        // Clear all WIP keys
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('goutreine_wip_')) localStorage.removeItem(k)
        })
        log.push('✅ Fila offline e WIPs limpos')
      } catch {}

      setResult({ success: true, log })
    } catch (err) {
      log.push(`❌ Erro geral: ${err.message}`)
      setResult({ success: false, log })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="bg-brand-card border border-red-500/30 rounded-xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-red-400">Reset de Progresso</p>
          <p className="text-brand-muted text-sm mt-0.5">Exclui todos os logs de treino, sessões e dados de progresso de todos os alunos</p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="bg-red-500/20 text-red-400 border border-red-500/40 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50 shrink-0"
        >
          {resetting ? 'Resetando...' : 'Resetar Progresso'}
        </button>
      </div>
      {result && (
        <div className="mt-3 bg-brand-dark rounded-lg p-3 space-y-1">
          {result.log.map((line, i) => (
            <p key={i} className="text-xs font-mono">{line}</p>
          ))}
          {result.success && (
            <p className="text-brand-green text-xs font-semibold mt-2">Reset concluído. Recarregue a página para ver os dados atualizados.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const students = store.users.filter((u) => u.role === 'student')
  const totalStudents = students.length

  const activeStudents = store.training_phases.filter(
    (p) => p.status === 'active'
  )
  const activeStudentIds = new Set(activeStudents.map((p) => p.student_id))
  const activeCount = students.filter((s) => activeStudentIds.has(s.id)).length

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const workoutsThisWeek = store.workout_sessions.filter((ws) => {
    if (!ws.date) return false
    return new Date(ws.date + 'T00:00:00') >= sevenDaysAgo
  }).length

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-brand-muted mt-1">
            Bem-vindo{user?.name ? `, ${user.name}` : ''}!
          </p>
        </div>

        {/* Stats */}
        <section>
          <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">
            Visão Geral
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total de Alunos" value={totalStudents} />
            <StatCard label="Alunos Ativos" value={activeCount} color="text-blue-400" />
            <StatCard label="Treinos Esta Semana" value={workoutsThisWeek} color="text-purple-400" />
          </div>
        </section>

        {/* Quick links */}
        <section>
          <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">
            Gerenciamento Rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickLink
              label="Gerenciar Alunos"
              description="Visualize e gerencie os alunos cadastrados"
              route="admin/alunos"
            />
            <QuickLink
              label="Biblioteca de Exercícios"
              description="Adicione e edite exercícios disponíveis"
              route="admin/exercicios"
            />
            <QuickLink
              label="Templates de Treino"
              description="Crie e gerencie periodizações reutilizáveis"
              route="admin/templates"
            />
          </div>
        </section>

        {/* Admin tools */}
        <section>
          <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">
            Ferramentas
          </h2>
          <ResetProgressButton />
        </section>
      </div>
    </AdminLayout>
  )
}
