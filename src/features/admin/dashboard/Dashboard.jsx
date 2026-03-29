import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
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
              label="Treinos Base"
              description="Crie e gerencie treinos base reutilizáveis"
              route="admin/templates"
            />
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
