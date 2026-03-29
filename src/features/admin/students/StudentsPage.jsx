import { navigate } from '../../../app/router'
import { store } from '../../../shared/constants/store'
import { getActivePhase } from '../../../shared/utils/phase-helpers'
import AdminLayout from '../AdminLayout'

function formatLastWorkout(studentId) {
  const sessions = store.workout_sessions
    .filter((ws) => ws.student_id === studentId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  if (!sessions.length) return null
  const d = new Date(sessions[0].date + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StudentCard({ student }) {
  const activePhase = getActivePhase(student.id)
  const lastWorkout = formatLastWorkout(student.id)

  return (
    <button
      onClick={() => navigate(`admin/treinos/${student.id}`)}
      className="w-full text-left bg-brand-card border border-brand-secondary rounded-xl p-5 hover:border-brand-green transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-white group-hover:text-brand-green transition-colors truncate">
            {student.name}
          </p>
          <p className="text-brand-muted text-sm truncate mt-0.5">{student.email}</p>
        </div>
        <span className="shrink-0 text-brand-muted text-sm">›</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {activePhase ? (
          <span className="inline-flex items-center gap-1.5 bg-brand-green bg-opacity-20 text-brand-dark px-2.5 py-1 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green inline-block" />
            {activePhase.name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-brand-secondary text-brand-muted px-2.5 py-1 rounded-full text-xs">
            Sem fase ativa
          </span>
        )}

        {lastWorkout && (
          <span className="text-brand-muted text-xs self-center">
            Último treino: {lastWorkout}
          </span>
        )}
      </div>
    </button>
  )
}

export default function StudentsPage() {
  const students = store.users.filter((u) => u.role === 'student')

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Alunos</h1>
            <p className="text-brand-muted text-sm mt-1">
              {students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* List */}
        {students.length === 0 ? (
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
            <p className="text-brand-muted">Nenhum aluno cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
