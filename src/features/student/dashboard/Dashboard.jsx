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
} from '../../../shared/utils/phase-helpers'
import { getMuscleGroupColor, getMuscleGroupName } from '../../../shared/utils/muscle-groups'
import { getTodayFormatted, formatDate } from '../../../shared/utils/dates'
import StudentLayout from '../StudentLayout'

function getWorkoutsThisMonth(user) {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  return store.workout_sessions.filter(s => s.student_id === user.id && s.date >= firstOfMonth).length
}

function getStreak(studentId) {
  const sessions = store.workout_sessions.filter(s => s.student_id === studentId)
  return sessions.length > 0 ? Math.min(sessions.length, 30) : 0
}

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
  const nextCfg = scheme ? scheme.configs.find(c => c.week === currentWeek + 1) : null
  const currentPhaseLabel = currentCfg ? currentCfg.phase : ''
  const currentPhaseColor = currentCfg ? currentCfg.phase_color : '#A4E44B'
  const currentDescription = currentCfg ? currentCfg.description : ''

  const startDate = activePhase?.start_date ? new Date(activePhase.start_date + 'T00:00:00') : null
  const totalWeeksMs = totalWeeks * 7 * 24 * 60 * 60 * 1000
  const endDate = activePhase?.end_date
    ? new Date(activePhase.end_date + 'T00:00:00')
    : startDate
    ? new Date(startDate.getTime() + totalWeeksMs)
    : null
  const today = new Date()
  const daysRemaining =
    endDate && !isNaN(endDate)
      ? Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)))
      : null

  // Next workout plan from active phase — rotates A → B → C → A
  const activePlans = store.training_plans
    .filter(p => store.training_phases.find(ph => ph.id === p.phase_id && ph.status === 'active'))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const nextPlan = (() => {
    if (activePlans.length === 0) return null
    if (activePlans.length === 1) return activePlans[0]

    // Find the most recent session among these plans
    const studentSessions = store.workout_sessions
      .filter(s => s.student_id === user.id && activePlans.some(p => p.id === s.plan_id))
      .sort((a, b) => new Date(b.date || b.session_date) - new Date(a.date || a.session_date))

    if (studentSessions.length === 0) return activePlans[0]

    const lastPlanId = studentSessions[0].plan_id
    const lastIndex = activePlans.findIndex(p => p.id === lastPlanId)
    if (lastIndex === -1) return activePlans[0]

    // Next in rotation (wraps around)
    return activePlans[(lastIndex + 1) % activePlans.length]
  })()

  // Recent activity: last 5 sessions for this student sorted by date desc
  const recentSessions = store.workout_sessions
    .filter(s => s.student_id === user.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  const workoutsThisMonth = getWorkoutsThisMonth(user)
  const streak = getStreak(user.id)

  return (
    <StudentLayout activeRoute="dashboard">
      <div className="p-4 md:p-6 space-y-6">

        {/* Greeting */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-1">
            Olá, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-brand-muted capitalize">{getTodayFormatted()}</p>
        </div>

        {/* Fase Atual */}
        <div className="card-dark rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Fase Atual</h2>

          {!activePhase ? (
            <p className="text-brand-muted">Nenhuma fase ativa</p>
          ) : (
            <div>
              {/* Phase header: name + badge */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold" style={{ color: currentPhaseColor }}>
                  {activePhase.name}
                </h3>
                {currentPhaseLabel && (
                  <span
                    style={{
                      backgroundColor: currentPhaseColor + '25',
                      color: currentPhaseColor,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {currentPhaseLabel}
                  </span>
                )}
              </div>

              {/* Date range + days remaining */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-brand-muted">
                  {startDate
                    ? startDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
                    : '—'}
                  {' – '}
                  {endDate && !isNaN(endDate)
                    ? endDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
                    : '—'}
                </p>
                {daysRemaining !== null && (
                  <p className="text-xs text-brand-muted">{daysRemaining} dias restantes</p>
                )}
              </div>

              {/* Week + timeline */}
              <div className="bg-brand-secondary rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold" style={{ color: currentPhaseColor }}>
                    Semana {currentWeek} de {totalWeeks}
                  </span>
                  {currentDescription && (
                    <span className="text-xs text-brand-muted">{currentDescription}</span>
                  )}
                </div>

                {scheme ? (
                  <div className="relative mt-3 mb-2">
                    {/* Dot + progress line row */}
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: '32px' }}>
                      {/* Background track */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '12px',
                          right: '12px',
                          height: '3px',
                          backgroundColor: '#1a1a1a',
                          transform: 'translateY(-50%)',
                          borderRadius: '2px',
                          zIndex: 0,
                        }}
                      />
                      {/* Progress gradient line */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '12px',
                          width:
                            totalWeeks > 1
                              ? `${((currentWeek - 1) / (totalWeeks - 1)) * 100}%`
                              : '0%',
                          height: '3px',
                          background: `linear-gradient(90deg, ${scheme.configs[0]?.phase_color || '#3B82F6'}, ${currentPhaseColor})`,
                          transform: 'translateY(-50%)',
                          borderRadius: '2px',
                          zIndex: 1,
                        }}
                      />
                      {/* Week dots */}
                      {scheme.configs.map(cfg => {
                        const isActive = cfg.week === currentWeek
                        const isPast = cfg.week < currentWeek
                        const pct =
                          totalWeeks > 1 ? ((cfg.week - 1) / (totalWeeks - 1)) * 100 : 50

                        return (
                          <div
                            key={cfg.week}
                            style={{
                              position: 'absolute',
                              left: `${pct}%`,
                              transform: 'translateX(-50%)',
                              zIndex: 2,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                            }}
                          >
                            <div
                              style={{
                                width: isActive ? '26px' : '18px',
                                height: isActive ? '26px' : '18px',
                                borderRadius: '50%',
                                backgroundColor: isPast || isActive ? cfg.phase_color : '#2a2a2a',
                                border: isActive
                                  ? '3px solid #fff'
                                  : isPast
                                  ? `2px solid ${cfg.phase_color}`
                                  : '2px solid #3a3a3a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isActive ? '10px' : '8px',
                                fontWeight: '700',
                                color: isPast || isActive ? '#fff' : '#666',
                                transition: 'all 0.3s',
                                boxShadow: isActive ? `0 0 12px ${cfg.phase_color}66` : 'none',
                              }}
                            >
                              {cfg.week}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Phase labels centered below dot groups */}
                    <div style={{ position: 'relative', height: '14px', marginTop: '4px' }}>
                      {(() => {
                        const groups = []
                        let lastPhase = ''
                        scheme.configs.forEach(cfg => {
                          if (cfg.phase !== lastPhase) {
                            groups.push({
                              phase: cfg.phase,
                              color: cfg.phase_color,
                              startWeek: cfg.week,
                              endWeek: cfg.week,
                            })
                            lastPhase = cfg.phase
                          } else {
                            groups[groups.length - 1].endWeek = cfg.week
                          }
                        })
                        return groups.map((g, i) => {
                          const startPct =
                            totalWeeks > 1 ? ((g.startWeek - 1) / (totalWeeks - 1)) * 100 : 0
                          const endPct =
                            totalWeeks > 1 ? ((g.endWeek - 1) / (totalWeeks - 1)) * 100 : 100
                          const centerPct = (startPct + endPct) / 2
                          return (
                            <span
                              key={i}
                              style={{
                                position: 'absolute',
                                left: `${centerPct}%`,
                                transform: 'translateX(-50%)',
                                fontSize: '8px',
                                fontWeight: '600',
                                color: g.color,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {g.phase}
                            </span>
                          )
                        })
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Fallback: simple block progress */
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: totalWeeks }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 h-2 rounded-full"
                        style={{ backgroundColor: i + 1 <= currentWeek ? currentPhaseColor : '#1a1a1a' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Next phase preview */}
              {nextCfg && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-dark">
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: nextCfg.phase_color,
                    }}
                  />
                  <span className="text-xs text-brand-muted">Próxima fase: </span>
                  <span
                    style={{ fontSize: '12px', fontWeight: '600', color: nextCfg.phase_color }}
                  >
                    {nextCfg.phase}
                  </span>
                  <span className="text-xs text-brand-muted">— {nextCfg.description}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="card-dark rounded-lg p-4">
            <div className="text-3xl font-bold text-brand-green">{workoutsThisMonth}</div>
            <p className="text-xs text-brand-muted mt-1">Treinos este mês</p>
          </div>
          <div className="card-dark rounded-lg p-4">
            <div className="text-3xl font-bold text-brand-green">{streak}</div>
            <p className="text-xs text-brand-muted mt-1">Dias sem faltar</p>
          </div>
        </div>

        {/* Próximo Treino */}
        <div className="card-dark rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Próximo Treino</h2>

          {nextPlan ? (
            <div>
              {/* Plan name + phase badge */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold">{nextPlan.name}</h3>
                {currentCfg && (
                  <span
                    style={{
                      backgroundColor: currentCfg.phase_color + '25',
                      color: currentCfg.phase_color,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                    }}
                  >
                    {currentCfg.phase}
                  </span>
                )}
              </div>

              {/* Muscle group badges */}
              {nextPlan.muscle_groups && nextPlan.muscle_groups.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {nextPlan.muscle_groups.map(mgId => (
                    <span key={mgId} className={`muscle-badge ${getMuscleGroupColor(mgId)}`}>
                      {getMuscleGroupName(mgId)}
                    </span>
                  ))}
                </div>
              )}

              {/* Start button */}
              <button
                onClick={() => navigate(`executar/${nextPlan.id}`)}
                className="w-full btn-green py-2.5 rounded-lg font-medium"
              >
                Iniciar Treino
              </button>

              {/* Phase tip */}
              {currentCfg && PHASE_TIPS[currentCfg.phase] && (
                <p
                  className="text-center mt-2"
                  style={{ fontSize: '12px', color: currentCfg.phase_color }}
                >
                  → Em {currentCfg.phase}: {PHASE_TIPS[currentCfg.phase]}
                </p>
              )}
            </div>
          ) : (
            <p className="text-brand-muted">Nenhum treino disponível</p>
          )}
        </div>

        {/* Atividade Recente */}
        <div className="card-dark rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Atividade Recente</h2>
          <div className="space-y-3">
            {recentSessions.length === 0 ? (
              <p className="text-brand-muted text-sm">Nenhuma sessão registrada ainda.</p>
            ) : (
              recentSessions.map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-2 border-b border-brand-secondary last:border-0"
                >
                  <div>
                    <p className="font-medium">{getPlanName(session.plan_id)}</p>
                    <p className="text-sm text-brand-muted">{formatDate(session.date)}</p>
                  </div>
                  <p className="text-sm text-brand-green">{session.duration_minutes} min</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </StudentLayout>
  )
}
