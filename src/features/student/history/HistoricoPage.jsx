import { useState } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
import StudentLayout from '../StudentLayout'
import { store } from '../../../shared/constants/store'
import { getPlanName, getExerciseName } from '../../../shared/utils/phase-helpers'
import { formatDateLong } from '../../../shared/utils/dates'
import { IconChevronRight } from '../../../shared/components/icons'

function getSessionLogs(sessionId) {
  return store.session_logs.filter(l => l.session_id === sessionId)
}

function calculateTotalVolume(sessionId) {
  return store.session_logs
    .filter(l => l.session_id === sessionId)
    .reduce((sum, l) => sum + l.weight_kg * l.reps_done, 0)
}

const PERIOD_OPTIONS = [
  { value: '7',   label: '7 dias' },
  { value: '30',  label: '30 dias' },
  { value: '90',  label: '90 dias' },
  { value: 'all', label: 'Todos' },
]

export default function HistoricoPage() {
  const { user } = useAuth()
  const [filterPeriod, setFilterPeriod] = useState('30')
  const [expandedSession, setExpandedSession] = useState(null)

  const cutoffDate = new Date()
  if (filterPeriod !== 'all') {
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(filterPeriod))
  }

  const filteredSessions = store.workout_sessions
    .filter(s => {
      if (s.student_id !== user?.id) return false
      if (filterPeriod === 'all') return true
      return new Date(s.date + 'T00:00:00') >= cutoffDate
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 space-y-6">

        {/* Header + period filter */}
        <div>
          <h1 className="text-3xl font-bold mb-4">Histórico de Treinos</h1>
          <div className="flex gap-2 flex-wrap">
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterPeriod(value)}
                className={`px-4 py-2 rounded text-sm font-medium transition ${
                  filterPeriod === value
                    ? 'btn-green'
                    : 'bg-brand-secondary border border-brand-muted text-white hover:border-brand-green'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Session list */}
        {filteredSessions.length === 0 ? (
          <div className="card-dark rounded-lg p-8 text-center">
            <p className="text-brand-muted">Nenhum treino neste período</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map(session => {
              const isExpanded = expandedSession === session.id
              const sessionLogs = getSessionLogs(session.id)
              const totalVolume = calculateTotalVolume(session.id)

              return (
                <div key={session.id} className="card-dark rounded-lg overflow-hidden">
                  {/* Card header — click to expand */}
                  <div
                    className="p-4 cursor-pointer hover:bg-opacity-80 flex items-center justify-between"
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold">{getPlanName(session.plan_id)}</h3>
                      <p className="text-sm text-brand-muted">{formatDateLong(session.date)}</p>
                      <p className="text-sm text-brand-green mt-1">
                        {session.duration_minutes} min • {totalVolume.toFixed(0)} kg
                      </p>
                    </div>
                    <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <IconChevronRight />
                    </span>
                  </div>

                  {/* Expanded exercise logs */}
                  {isExpanded && (
                    <div className="border-t border-brand-secondary p-4 bg-brand-secondary bg-opacity-30 space-y-2">
                      {sessionLogs.map((log, idx) => (
                        <div key={idx} className="py-2 text-sm">
                          <p className="font-medium">
                            {getExerciseName(log.exercise_id)} - Série {log.set_number}
                          </p>
                          <p className="text-brand-muted">
                            {log.weight_kg}kg × {log.reps_done}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </StudentLayout>
  )
}
