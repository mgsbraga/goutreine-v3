import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
import { store } from '../../../shared/constants/store'
import { PERIODIZATION_SCHEMES } from '../../../shared/constants/periodization-schemes'
import { PHASE_TIPS } from '../../../shared/constants/brand'
import {
  getActivePhase,
  getCurrentWeekForPhase,
  getSchemeForPhase,
  getPlanName,
  getExerciseName,
} from '../../../shared/utils/phase-helpers'
import { getMuscleGroupColor, getMuscleGroupName, getExerciseActivations } from '../../../shared/utils/muscle-groups'
import { getTodayFormatted, formatDate } from '../../../shared/utils/dates'
import StudentLayout from '../StudentLayout'

// ─── Constants ──────────────────────────────────────────────────────────────

const MUSCLE_COLOR_MAP = {
  1: '#A4E44B', 2: '#cccccc', 3: '#ff9664', 4: '#9664ff', 5: '#ff6496',
  6: '#64ff96', 7: '#ffc83c', 8: '#ff78c8', 9: '#64c8ff', 10: '#ff5050', 11: '#ffb432',
}

// ─── Data helpers ───────────────────────────────────────────────────────────

function getSessionsInPeriod(studentId, days) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return store.workout_sessions.filter(
    s => s.student_id === studentId && new Date((s.date || s.session_date) + 'T00:00:00') >= since
  )
}

function getVolumeInPeriod(studentId, days) {
  const sessions = getSessionsInPeriod(studentId, days)
  const sessionIds = sessions.map(s => s.id)
  const logs = store.session_logs.filter(l => sessionIds.includes(l.session_id))
  return logs.reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps_done || 0), 0)
}

function getWorkoutsThisMonth(studentId) {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  return store.workout_sessions.filter(s => s.student_id === studentId && (s.date || s.session_date) >= firstOfMonth).length
}

function getWorkoutsPreviousMonth(studentId) {
  const now = new Date()
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1).toISOString().split('T')[0]
  return store.workout_sessions.filter(
    s => s.student_id === studentId && (s.date || s.session_date) >= firstOfPrevMonth && (s.date || s.session_date) <= lastOfPrevMonth
  ).length
}

function getVolumeThisMonth(studentId) {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const sessions = store.workout_sessions.filter(s => s.student_id === studentId && (s.date || s.session_date) >= firstOfMonth)
  const sessionIds = sessions.map(s => s.id)
  const logs = store.session_logs.filter(l => sessionIds.includes(l.session_id))
  return logs.reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps_done || 0), 0)
}

function getVolumePreviousMonth(studentId) {
  const now = new Date()
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1).toISOString().split('T')[0]
  const sessions = store.workout_sessions.filter(
    s => s.student_id === studentId && (s.date || s.session_date) >= firstOfPrevMonth && (s.date || s.session_date) <= lastOfPrevMonth
  )
  const sessionIds = sessions.map(s => s.id)
  const logs = store.session_logs.filter(l => sessionIds.includes(l.session_id))
  return logs.reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps_done || 0), 0)
}

function getAdherenceThisMonth(studentId, weeklyGoal) {
  if (!weeklyGoal || weeklyGoal <= 0) return null
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysSinceFirst = Math.ceil((now - firstOfMonth) / (1000 * 60 * 60 * 24)) + 1
  const weeksInMonth = Math.max(1, daysSinceFirst / 7)
  const sessionsThisMonth = getWorkoutsThisMonth(studentId)
  return Math.min(100, Math.round((sessionsThisMonth / (weeklyGoal * weeksInMonth)) * 100))
}

function getTop3PRs(studentId) {
  const studentSessionIds = store.workout_sessions
    .filter(s => s.student_id === studentId)
    .map(s => s.id)
  const studentLogs = store.session_logs.filter(l => studentSessionIds.includes(l.session_id))

  const prMap = {}
  for (const log of studentLogs) {
    if (!log.exercise_id || !log.weight_kg) continue
    if (!prMap[log.exercise_id] || log.weight_kg > prMap[log.exercise_id]) {
      prMap[log.exercise_id] = log.weight_kg
    }
  }
  return Object.entries(prMap)
    .map(([id, weight]) => ({ exerciseId: parseInt(id), weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
}

function formatVolume(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return Math.round(v).toString()
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()

  if (!user) return null

  const activePhase = getActivePhase(user.id)
  const currentWeek = getCurrentWeekForPhase(activePhase)
  const totalWeeks = activePhase?.total_weeks || 8
  const scheme = getSchemeForPhase(activePhase)
  const currentCfg = scheme
    ? scheme.configs.find(c => c.week === currentWeek) || scheme.configs[scheme.configs.length - 1]
    : null
  const currentPhaseColor = currentCfg ? currentCfg.phase_color : '#A4E44B'

  // Next workout plan from active phase — rotates A -> B -> C -> A
  const activePlans = store.training_plans
    .filter(p => store.training_phases.find(ph => ph.id === p.phase_id && ph.status === 'active'))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const nextPlan = (() => {
    if (activePlans.length === 0) return null
    if (activePlans.length === 1) return activePlans[0]
    const studentSessions = store.workout_sessions
      .filter(s => s.student_id === user.id && activePlans.some(p => p.id === s.plan_id))
      .sort((a, b) => new Date(b.date || b.session_date) - new Date(a.date || a.session_date))
    if (studentSessions.length === 0) return activePlans[0]
    const lastPlanId = studentSessions[0].plan_id
    const lastIndex = activePlans.findIndex(p => p.id === lastPlanId)
    if (lastIndex === -1) return activePlans[0]
    return activePlans[(lastIndex + 1) % activePlans.length]
  })()

  // Exercise count and estimated time for next plan
  const nextPlanExerciseCount = nextPlan
    ? store.session_logs.length > 0
      ? new Set(
          store.session_logs
            .filter(l => {
              const s = store.workout_sessions.find(ws => ws.id === l.session_id)
              return s && s.plan_id === nextPlan.id
            })
            .map(l => l.exercise_id)
        ).size || '—'
      : '—'
    : 0

  // Last session date for this plan
  const lastSessionForPlan = nextPlan
    ? store.workout_sessions
        .filter(s => s.student_id === user.id && s.plan_id === nextPlan.id)
        .sort((a, b) => new Date(b.date || b.session_date) - new Date(a.date || a.session_date))[0]
    : null
  const lastSessionDate = lastSessionForPlan
    ? formatDate(lastSessionForPlan.date || lastSessionForPlan.session_date)
    : null

  // KPIs
  const workoutsThisMonth = getWorkoutsThisMonth(user.id)
  const workoutsPrevMonth = getWorkoutsPreviousMonth(user.id)
  const workoutsChange = workoutsThisMonth - workoutsPrevMonth

  const volumeThisMonth = getVolumeThisMonth(user.id)
  const volumePrevMonth = getVolumePreviousMonth(user.id)
  const volumeChangePct = volumePrevMonth > 0 ? Math.round(((volumeThisMonth - volumePrevMonth) / volumePrevMonth) * 100) : 0

  const weeklyGoal = user.weekly_goal
  const adherence = getAdherenceThisMonth(user.id, weeklyGoal)

  // Top 3 PRs
  const top3 = getTop3PRs(user.id)
  const prColors = ['#A4E44B', '#cccccc', '#CD7F32']
  const medals = ['🥇', '🥈', '🥉']

  // Progress bar percentage
  const progressPct = totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0

  return (
    <StudentLayout activeRoute="dashboard">
      <div className="p-4 md:p-6 space-y-4">

        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold mb-0.5">
            Olá, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-xs text-brand-muted">Vamos treinar hoje?</p>
        </div>

        {/* Phase indicator — compact */}
        {activePhase && currentCfg && (
          <div className="flex items-center gap-3 p-3 bg-brand-card border border-brand-secondary rounded-xl">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentPhaseColor, boxShadow: `0 0 6px ${currentPhaseColor}60` }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: currentPhaseColor }}>
                {currentCfg.phase.toUpperCase()} — Semana {currentWeek} de {totalWeeks}
              </div>
              <div className="text-[10px] text-brand-muted truncate">
                {scheme ? scheme.name : ''}{currentCfg.description ? ` \· ${currentCfg.description}` : ''}
              </div>
              <div className="h-1 bg-brand-secondary rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progressPct}%`, backgroundColor: currentPhaseColor }}
                />
              </div>
            </div>
          </div>
        )}

        {!activePhase && (
          <div className="p-3 bg-brand-card border border-brand-secondary rounded-xl">
            <p className="text-brand-muted text-xs">Nenhuma fase ativa</p>
          </div>
        )}

        {/* Next workout card */}
        {nextPlan ? (
          <div
            className="rounded-xl p-4"
            style={{ background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)', border: '1px solid #A4E44B30' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#A4E44B20' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A4E44B" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold truncate">{nextPlan.name}</div>
                <div className="text-[11px] text-brand-muted">
                  {nextPlanExerciseCount !== '—' ? `${nextPlanExerciseCount} exerc\ícios` : ''}
                  {lastSessionDate ? ` \· \Último: ${lastSessionDate}` : ''}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`executar/${nextPlan.id}`)}
              className="w-full bg-brand-green text-brand-dark py-2.5 rounded-lg text-[13px] font-semibold"
            >
              Iniciar Treino
            </button>
          </div>
        ) : (
          <div className="p-4 bg-brand-card border border-brand-secondary rounded-xl">
            <p className="text-brand-muted text-sm">Nenhum treino dispon\ível</p>
          </div>
        )}

        {/* KPIs — 3 columns */}
        <div className="grid grid-cols-3 gap-2">
          {/* Treinos no mes */}
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-3 text-center">
            <div className="text-[22px] font-bold" style={{ color: '#A4E44B' }}>{workoutsThisMonth}</div>
            <div className="text-[9px] text-brand-muted mt-0.5">Treinos no m\ês</div>
            <div className={`text-[8px] font-semibold mt-1 ${workoutsChange >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
              {workoutsChange >= 0 ? '\u2191' : '\u2193'} {Math.abs(workoutsChange)}
            </div>
          </div>

          {/* Volume total kg */}
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-3 text-center">
            <div className="text-[22px] font-bold" style={{ color: '#64c8ff' }}>{formatVolume(volumeThisMonth)}</div>
            <div className="text-[9px] text-brand-muted mt-0.5">Volume (kg)</div>
            <div className={`text-[8px] font-semibold mt-1 ${volumeChangePct >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
              {volumeChangePct >= 0 ? '\u2191' : '\u2193'} {Math.abs(volumeChangePct)}%
            </div>
          </div>

          {/* Aderencia */}
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-3 text-center">
            <div className="text-[22px] font-bold" style={{ color: '#ffc83c' }}>
              {adherence !== null ? `${adherence}%` : '\u2014'}
            </div>
            <div className="text-[9px] text-brand-muted mt-0.5">Ader\ência</div>
            <div className="text-[8px] font-semibold mt-1" style={{ color: '#ffc83c' }}>
              {weeklyGoal ? `Meta: ${weeklyGoal}\×/sem` : ''}
            </div>
          </div>
        </div>

        {/* Top 3 PRs */}
        {top3.length > 0 && (
          <div className="bg-brand-card border border-brand-secondary rounded-xl p-3.5">
            <div className="text-[13px] font-semibold mb-3">{'🏆'} Top 3 Cargas</div>
            <div className="grid grid-cols-3 gap-2">
              {top3.map((pr, i) => (
                <div key={pr.exerciseId} className="bg-brand-dark rounded-xl p-3 text-center">
                  <div className="text-xl">{medals[i]}</div>
                  <div className="text-[17px] font-bold my-1" style={{ color: prColors[i] }}>
                    {pr.weight}kg
                  </div>
                  <div className="text-[9px] text-brand-muted leading-tight">
                    {getExerciseName(pr.exerciseId)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </StudentLayout>
  )
}
