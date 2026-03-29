import { useState } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
import StudentLayout from '../StudentLayout'
import { store } from '../../../shared/constants/store'
import {
  getActivePhase,
  getCurrentWeekForPhase,
  getExerciseName,
  getPlanName,
  getPlanExercisesForWeek,
} from '../../../shared/utils/phase-helpers'
import { formatDateLong } from '../../../shared/utils/dates'

const weekLabels = {
  1: 'Adaptação',
  2: 'Adaptação',
  3: 'Construção',
  4: 'Construção',
  5: 'Intensificação',
  6: 'Pico',
  7: 'Pico',
  8: 'Deload',
}

const phaseColors = {
  'Adaptação':     { bg: 'bg-blue-900 bg-opacity-40',   border: 'border-blue-500',   text: 'text-blue-400' },
  'Construção':    { bg: 'bg-yellow-900 bg-opacity-40', border: 'border-yellow-500', text: 'text-yellow-400' },
  'Intensificação':{ bg: 'bg-orange-900 bg-opacity-40', border: 'border-orange-500', text: 'text-orange-400' },
  'Pico':          { bg: 'bg-red-900 bg-opacity-40',    border: 'border-red-500',    text: 'text-red-400' },
  'Deload':        { bg: 'bg-gray-700 bg-opacity-40',   border: 'border-gray-500',   text: 'text-gray-400' },
}

const dayMap = {
  'Segunda': 1,
  'Terça':   2,
  'Quarta':  3,
  'Quinta':  4,
  'Sexta':   5,
  'Sábado':  6,
  'Domingo': 0,
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function calculateTotalVolume(sessionId) {
  return store.session_logs
    .filter(l => l.session_id === sessionId)
    .reduce((sum, l) => sum + l.weight_kg * l.reps_done, 0)
}

export default function CalendarioPage() {
  const { user } = useAuth()
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  const activePhase = getActivePhase(user?.id)
  const currentWeek = getCurrentWeekForPhase(activePhase)
  const totalWeeks = activePhase?.total_weeks || 8
  const plans = store.training_plans.filter(p => p.phase_id === activePhase?.id)

  const getPhaseColor = (weekNum) => {
    const label = weekLabels[weekNum]
    return label ? phaseColors[label] || phaseColors['Adaptação'] : null
  }

  const getPlannedTraining = (date) => {
    if (!activePhase) return null
    const phaseStart = new Date(activePhase.start_date + 'T00:00:00')
    const phaseEnd = activePhase.end_date ? new Date(activePhase.end_date + 'T00:00:00') : null
    if (date < phaseStart || (phaseEnd && date > phaseEnd)) return null
    const dow = date.getDay()
    for (const plan of plans) {
      if (!plan.day_label) continue
      const days = plan.day_label.split('/').map(d => d.trim())
      for (const dayName of days) {
        if (dayMap[dayName] === dow) return plan
      }
    }
    return null
  }

  const getWeekNumberForDate = (date) => {
    if (!activePhase) return null
    const phaseStart = new Date(activePhase.start_date + 'T00:00:00')
    const diffMs = date - phaseStart
    if (diffMs < 0) return null
    const weekNum = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
    if (weekNum > totalWeeks) return null
    return weekNum
  }

  const getSessionForDate = (dateStr) =>
    store.workout_sessions.find(s => s.date === dateStr && s.student_id === user?.id)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const startOffset = startDow === 0 ? 6 : startDow - 1

  const calendarDays = []
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push({ date: new Date(year, month, 1 - startOffset + i), isCurrentMonth: false })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    calendarDays.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  while (calendarDays.length % 7 !== 0) {
    const d = new Date(year, month + 1, calendarDays.length - startOffset - lastDay.getDate() + 1)
    calendarDays.push({ date: d, isCurrentMonth: false })
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))
  const goToday = () => setViewDate(new Date())

  const selectedSession = selectedDay ? getSessionForDate(selectedDay) : null
  const selectedLogs = selectedSession
    ? store.session_logs.filter(l => l.session_id === selectedSession.id)
    : []

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-1">Calendário</h1>
          {activePhase && (
            <p className="text-brand-muted">
              {activePhase.name} — Semana {currentWeek} de {totalWeeks} ({weekLabels[currentWeek] || ''})
            </p>
          )}
        </div>

        {/* Phase week bar */}
        {activePhase && (
          <div className="card-dark rounded-lg p-4">
            <h3 className="text-sm font-medium text-brand-muted mb-3">Semanas da Periodização</h3>
            <div className="flex gap-1">
              {Array.from({ length: totalWeeks }).map((_, i) => {
                const wn = i + 1
                const isCurrent = wn === currentWeek
                const isPast = wn < currentWeek
                const phColor = getPhaseColor(wn)
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-lg p-1.5 text-center transition ${
                      isCurrent
                        ? `${phColor.bg} border ${phColor.border}`
                        : isPast
                        ? 'bg-brand-secondary bg-opacity-50'
                        : 'bg-brand-dark border border-brand-secondary'
                    }`}
                  >
                    <div className={`text-xs font-bold ${isCurrent ? phColor.text : isPast ? 'text-white' : 'text-brand-muted'}`}>
                      {wn}
                    </div>
                    <div className={`text-[8px] ${isCurrent ? phColor.text : 'text-brand-muted'}`}>
                      {(weekLabels[wn] || '').substring(0, 4)}
                    </div>
                    {isPast && (
                      <div className="text-[8px] text-brand-green">✓</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Calendar grid */}
        <div className="card-dark rounded-lg p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="text-brand-muted hover:text-white transition px-3 py-1 rounded hover:bg-brand-secondary"
            >
              ←
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold capitalize">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={goToday}
                className="text-xs text-brand-green hover:underline mt-1"
              >
                Ir para hoje
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="text-brand-muted hover:text-white transition px-3 py-1 rounded hover:bg-brand-secondary"
            >
              →
            </button>
          </div>

          {/* Day name headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map(dn => (
              <div key={dn} className="text-center text-xs text-brand-muted font-medium py-1">
                {dn}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayObj, idx) => {
              const d = dayObj.date
              const dateStr = d.toISOString().split('T')[0]
              const isToday = dateStr === todayStr
              const plannedPlan = getPlannedTraining(d)
              const session = getSessionForDate(dateStr)
              const weekNum = getWeekNumberForDate(d)
              const isInPhase = weekNum !== null
              const phaseColor = weekNum ? getPhaseColor(weekNum) : null
              const isSelected = selectedDay === dateStr
              const isMonday = d.getDay() === 1
              const isClickable = dayObj.isCurrentMonth && (session || plannedPlan)

              return (
                <div
                  key={idx}
                  onClick={() => isClickable && setSelectedDay(isSelected ? null : dateStr)}
                  className={`relative min-h-[52px] md:min-h-[64px] rounded-lg p-1 text-center transition border ${
                    !dayObj.isCurrentMonth
                      ? 'opacity-30 border-transparent'
                      : isSelected
                      ? 'border-brand-green bg-brand-green bg-opacity-10'
                      : isToday
                      ? 'border-brand-green border-opacity-60 bg-brand-dark'
                      : plannedPlan && phaseColor
                      ? `${phaseColor.bg} ${phaseColor.border} ${session ? '' : 'opacity-70'}`
                      : isInPhase && phaseColor
                      ? `${phaseColor.bg} border-transparent opacity-40`
                      : 'border-transparent hover:bg-brand-secondary hover:bg-opacity-20'
                  } ${isClickable ? 'cursor-pointer' : ''}`}
                >
                  <div className={`text-xs font-medium mb-0.5 ${
                    isToday ? 'text-brand-green font-bold' : !dayObj.isCurrentMonth ? 'text-brand-muted' : 'text-white'
                  }`}>
                    {d.getDate()}
                  </div>

                  {plannedPlan && dayObj.isCurrentMonth && (
                    <div className={`text-[10px] font-bold ${phaseColor ? phaseColor.text : 'text-brand-muted'}`}>
                      {plannedPlan.name.replace('Treino ', '')}
                    </div>
                  )}

                  {session && dayObj.isCurrentMonth && (
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-brand-green rounded-full flex items-center justify-center">
                      <span className="text-[7px] text-brand-dark font-bold">✓</span>
                    </div>
                  )}

                  {isMonday && weekNum && dayObj.isCurrentMonth && (
                    <div className="absolute bottom-0.5 left-0.5 text-[8px] text-brand-muted">
                      S{weekNum}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="card-dark rounded-lg p-4">
          <h3 className="text-sm font-medium text-brand-muted mb-2">Legenda</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            {Object.entries(phaseColors).map(([phaseName, pc]) => (
              <div key={phaseName} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${pc.bg} border ${pc.border}`} />
                <span className="text-brand-muted">{phaseName}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand-green rounded-full" />
              <span className="text-brand-muted">Treino realizado</span>
            </div>
          </div>
          {plans.length > 0 && (
            <div className="flex flex-wrap gap-4 text-xs mt-2 pt-2 border-t border-brand-secondary">
              {plans.map(plan => (
                <div key={plan.id} className="flex items-center gap-2">
                  <span className="font-bold text-white">{plan.name.replace('Treino ', '')}</span>
                  <span className="text-brand-muted">{plan.name} — {plan.day_label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected day — completed session */}
        {selectedDay && selectedSession && (
          <div className="card-dark rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">{formatDateLong(selectedDay)}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-brand-muted hover:text-white text-sm">
                ✕
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-brand-green">
                {getPlanName(selectedSession.plan_id)}
              </span>
              <span className="text-xs text-brand-muted">{selectedSession.duration_minutes} min</span>
              <span className="text-xs text-brand-muted">
                Volume: {calculateTotalVolume(selectedSession.id).toFixed(0)} kg
              </span>
            </div>
            <div className="space-y-2">
              {(() => {
                const exerciseGroups = {}
                selectedLogs.forEach(log => {
                  if (!exerciseGroups[log.exercise_id]) exerciseGroups[log.exercise_id] = []
                  exerciseGroups[log.exercise_id].push(log)
                })
                return Object.entries(exerciseGroups).map(([exId, logs]) => (
                  <div key={exId} className="bg-brand-secondary bg-opacity-30 rounded p-2">
                    <p className="text-sm font-medium">{getExerciseName(parseInt(exId))}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {logs.map(log => (
                        <span
                          key={log.id}
                          className="text-xs text-brand-muted bg-brand-dark rounded px-2 py-0.5"
                        >
                          {log.weight_kg}kg x {log.reps_done}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {/* Selected day — planned (no session yet) */}
        {selectedDay && !selectedSession && (() => {
          const selDate = new Date(selectedDay + 'T00:00:00')
          const plannedPlan = getPlannedTraining(selDate)
          const weekNum = getWeekNumberForDate(selDate)
          if (!plannedPlan || !weekNum) return null
          const exercises = getPlanExercisesForWeek(plannedPlan.id, weekNum)
          return (
            <div className="card-dark rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">{formatDateLong(selectedDay)}</h3>
                <button onClick={() => setSelectedDay(null)} className="text-brand-muted hover:text-white text-sm">
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-medium text-brand-green">{plannedPlan.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-brand-green bg-opacity-20 text-brand-green">
                  Semana {weekNum} — {weekLabels[weekNum] || ''}
                </span>
              </div>
              <div className="space-y-2">
                {exercises.map(pe => {
                  const ex = store.exercises.find(e => e.id === pe.exercise_id)
                  return (
                    <div
                      key={pe.id}
                      className="bg-brand-secondary bg-opacity-30 rounded p-2 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{ex?.name}</p>
                        <p className="text-xs text-brand-muted">
                          {pe.sets} x {pe.reps_min}–{pe.reps_max}
                          {pe.drop_sets > 0 ? ` + ${pe.drop_sets}D` : ''}
                        </p>
                      </div>
                      {pe.suggested_weight_kg > 0 && (
                        <span className="text-xs text-brand-green font-medium">
                          {pe.suggested_weight_kg}kg
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => navigate(`executar/${plannedPlan.id}`)}
                className="w-full btn-green py-2 rounded font-medium mt-3"
              >
                Iniciar Treino
              </button>
            </div>
          )
        })()}

      </div>
    </StudentLayout>
  )
}
