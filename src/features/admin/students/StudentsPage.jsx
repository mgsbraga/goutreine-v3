import { useState, useMemo } from 'react'
import { navigate } from '../../../app/router'
import { store } from '../../../shared/constants/store'
import { getActivePhase } from '../../../shared/utils/phase-helpers'
import AdminLayout from '../AdminLayout'

const avatarColors = [
  'bg-brand-green/15 text-brand-green',
  'bg-orange-400/15 text-orange-400',
  'bg-purple-400/15 text-purple-400',
  'bg-pink-400/15 text-pink-400',
  'bg-sky-400/15 text-sky-400',
]

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return avatarColors[Math.abs(h) % avatarColors.length]
}

function getLastWorkoutInfo(studentId) {
  const sessions = store.workout_sessions
    .filter(ws => ws.student_id === studentId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  if (!sessions.length) return { text: 'Sem treino', days: 999, status: 'inactive' }
  const d = new Date(sessions[0].date + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  const text = diff === 0 ? 'Hoje' : diff === 1 ? 'Ontem' : `${diff}d atrás`
  const status = diff <= 3 ? 'active' : diff <= 7 ? 'warning' : 'inactive'
  return { text, days: diff, status }
}

function StudentCard({ student }) {
  const activePhase = getActivePhase(student.id)
  const workout = getLastWorkoutInfo(student.id)

  return (
    <button
      onClick={() => navigate(`admin/treinos/${student.id}`)}
      className="w-full flex items-center gap-3 bg-brand-card border border-brand-secondary rounded-xl px-3.5 py-3 hover:border-brand-green/30 transition-colors group"
    >
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-[15px] font-bold shrink-0 ${getAvatarColor(student.name)}`}>
        {getInitials(student.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="font-semibold text-white text-[15px] truncate">{student.name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {activePhase ? (
            <span className="inline-flex items-center bg-brand-green/15 text-brand-green px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap">
              {activePhase.name}
            </span>
          ) : (
            <span className="inline-flex items-center bg-brand-secondary text-brand-muted px-2 py-0.5 rounded-full text-[11px]">
              Sem fase ativa
            </span>
          )}
          <span className="text-[11px] text-brand-muted">{workout.text}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className={`w-2 h-2 rounded-full ${
          workout.status === 'active' ? 'bg-brand-green shadow-[0_0_6px_rgba(164,228,75,0.4)]'
          : workout.status === 'warning' ? 'bg-orange-400 shadow-[0_0_6px_rgba(255,150,100,0.4)]'
          : 'bg-neutral-600'
        }`} />
        <span className="text-brand-muted text-sm">›</span>
      </div>
    </button>
  )
}

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const students = useMemo(() => {
    let list = store.users.filter(u => u.role === 'student')

    // Search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    }

    // Filter
    if (filter !== 'all') {
      list = list.filter(s => {
        const info = getLastWorkoutInfo(s.id)
        if (filter === 'active') return info.status === 'active' || info.status === 'warning'
        if (filter === 'inactive') return info.status === 'inactive'
        return true
      })
    }

    // Sort by last workout (most recent first)
    list.sort((a, b) => getLastWorkoutInfo(a.id).days - getLastWorkoutInfo(b.id).days)

    return list
  }, [search, filter])

  const totalStudents = store.users.filter(u => u.role === 'student').length

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-brand-muted text-sm mt-1">
            {totalStudents} aluno{totalStudents !== 1 ? 's' : ''} cadastrado{totalStudents !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-brand-card border border-brand-secondary rounded-[10px] pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-green"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Ativos' },
            { key: 'inactive', label: 'Inativos' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                filter === f.key
                  ? 'bg-brand-green text-brand-dark border-brand-green font-semibold'
                  : 'bg-transparent text-brand-muted border-brand-secondary hover:border-brand-green hover:text-brand-green'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {students.length === 0 ? (
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-8 text-center">
            <p className="text-brand-muted">
              {search || filter !== 'all' ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {students.map(student => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
