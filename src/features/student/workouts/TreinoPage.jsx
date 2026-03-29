import { useState } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import { navigate } from '../../../app/router'
import StudentLayout from '../StudentLayout'
import { store } from '../../../shared/constants/store'
import { getActivePhase, getCurrentWeekForPhase, getSchemeForPhase, getExerciseName, getPlanExercisesForWeek } from '../../../shared/utils/phase-helpers'
import { getMuscleGroupColor, getMuscleGroupName } from '../../../shared/utils/muscle-groups'
import { formatDate } from '../../../shared/utils/dates'
import { IconChevronRight } from '../../../shared/components/icons'

function getLastWorkoutDate(planId) {
  const sessions = store.workout_sessions
    .filter(s => s.plan_id === planId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  return sessions[0]?.date || null
}

function getMuscleGroupsForPlan(planId) {
  const exercises = store.plan_exercises.filter(pe => pe.plan_id === planId)
  const groupIds = [...new Set(
    exercises.map(pe => {
      const ex = store.exercises.find(e => e.id === pe.exercise_id)
      return ex?.muscle_group_id
    }).filter(Boolean)
  )]
  return groupIds
}

export default function TreinoPage() {
  const { user } = useAuth()
  const [expandedPlan, setExpandedPlan] = useState(null)

  const phase = getActivePhase(user?.id)
  const currentWeek = getCurrentWeekForPhase(phase)
  const totalWeeks = phase?.total_weeks || 8
  const scheme = getSchemeForPhase(phase)
  const currentCfg = scheme
    ? scheme.configs.find(c => c.week === currentWeek) || scheme.configs[scheme.configs.length - 1]
    : null

  const plans = phase
    ? store.training_plans.filter(p => p.phase_id === phase.id)
    : []

  // Check for workout-in-progress
  const wipPlan = (() => {
    for (const plan of plans) {
      try {
        const raw = localStorage.getItem(`goutreine_wip_${plan.id}`)
        if (raw) {
          const wip = JSON.parse(raw)
          // Only show if less than 4 hours old and belongs to current user
          if (wip.userId === user?.id && (Date.now() - wip.savedAt) < 4 * 60 * 60 * 1000) {
            return { plan, wip, setsCompleted: Object.keys(wip.setLogs || {}).length }
          }
        }
      } catch {}
    }
    return null
  })()

  function discardWIP(planId) {
    try { localStorage.removeItem(`goutreine_wip_${planId}`) } catch {}
  }

  function togglePlan(planId) {
    setExpandedPlan(prev => prev === planId ? null : planId)
  }

  return (
    <StudentLayout>
      <div className="p-4 max-w-2xl mx-auto">

        {/* Resume workout-in-progress banner */}
        {wipPlan && (
          <div className="mb-4 bg-brand-green/10 border border-brand-green/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A4E44B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Treino em andamento</p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {wipPlan.plan.name} · {wipPlan.setsCompleted} série{wipPlan.setsCompleted !== 1 ? 's' : ''} feita{wipPlan.setsCompleted !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { discardWIP(wipPlan.plan.id); window.location.reload() }}
                  className="text-xs text-brand-muted hover:text-red-400 px-2 py-1.5 rounded-lg transition-colors"
                >
                  Descartar
                </button>
                <button
                  onClick={() => navigate(`executar/${wipPlan.plan.id}`)}
                  className="text-xs bg-brand-green text-brand-dark px-4 py-1.5 rounded-lg font-semibold"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Meus Treinos</h1>
          {phase && (
            <p className="text-brand-muted text-sm mt-1">{phase.name}</p>
          )}

          {/* Week progress bar */}
          {phase && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-brand-muted mb-1">
                <span>Semana {currentWeek} de {totalWeeks}</span>
                <span>{Math.round((currentWeek / totalWeeks) * 100)}%</span>
              </div>
              <div className="h-2 bg-brand-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-green rounded-full transition-all"
                  style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* No active phase */}
        {!phase && (
          <div className="card-dark rounded-xl p-8 text-center">
            <p className="text-brand-muted">Nenhuma fase ativa encontrada.</p>
            <p className="text-brand-muted text-sm mt-1">Aguarde seu treinador configurar seu plano.</p>
          </div>
        )}

        {/* No plans */}
        {phase && plans.length === 0 && (
          <div className="card-dark rounded-xl p-8 text-center">
            <p className="text-brand-muted">Nenhum treino encontrado para esta fase.</p>
          </div>
        )}

        {/* Plan cards */}
        <div className="flex flex-col gap-3">
          {plans.map(plan => {
            const isExpanded = expandedPlan === plan.id
            const exercises = getPlanExercisesForWeek(plan.id, currentWeek)
            const muscleGroupIds = getMuscleGroupsForPlan(plan.id)
            const lastDate = getLastWorkoutDate(plan.id)

            return (
              <div key={plan.id} className="card-dark rounded-xl overflow-hidden">

                {/* Card header — clickable to expand */}
                <button
                  className="w-full text-left p-4"
                  onClick={() => togglePlan(plan.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Plan name + day label */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-white">{plan.name}</h2>
                        {plan.day_label && (
                          <span className="text-xs text-brand-muted bg-brand-secondary px-2 py-0.5 rounded">
                            {plan.day_label}
                          </span>
                        )}
                      </div>

                      {/* Muscle group badges */}
                      {muscleGroupIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {muscleGroupIds.map(gid => (
                            <span
                              key={gid}
                              className={`muscle-badge ${getMuscleGroupColor(gid)}`}
                            >
                              {getMuscleGroupName(gid)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-brand-muted">
                        <span>{exercises.length} exercício{exercises.length !== 1 ? 's' : ''}</span>
                        {lastDate && (
                          <span>Último: {formatDate(lastDate)}</span>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <span
                      className={`text-brand-muted mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    >
                      <IconChevronRight />
                    </span>
                  </div>
                </button>

                {/* Expanded exercise list */}
                {isExpanded && (
                  <div className="border-t border-brand-secondary">
                    {exercises.length === 0 ? (
                      <p className="text-brand-muted text-sm p-4">Sem exercícios configurados.</p>
                    ) : (
                      <div className="divide-y divide-brand-secondary">
                        {exercises.map((pe, idx) => {
                          const isSuperset = !!pe.superset_group
                          const supersetPartner = isSuperset
                            ? exercises.find(
                                other => other.id !== pe.id && other.superset_group === pe.superset_group
                              )
                            : null

                          return (
                            <div
                              key={pe.id}
                              className={`px-4 py-3 ${isSuperset ? 'border-l-2 border-yellow-400 ml-1' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {/* Superset label */}
                                  {isSuperset && (
                                    <span className="text-xs font-bold text-yellow-400 mb-0.5 block">
                                      CONJUGADO
                                    </span>
                                  )}

                                  {/* Exercise name */}
                                  <p className="text-sm font-medium text-white">
                                    {idx + 1}. {getExerciseName(pe.exercise_id)}
                                  </p>

                                  {/* Superset partner */}
                                  {isSuperset && supersetPartner && (
                                    <p className="text-xs text-yellow-400 mt-0.5">
                                      ⇄ com {getExerciseName(supersetPartner.exercise_id)}
                                    </p>
                                  )}

                                  {/* Sets × reps */}
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-sm text-brand-green font-semibold">
                                      {pe.sets}×{pe.reps_min}
                                      {pe.reps_max && pe.reps_max !== pe.reps_min ? `–${pe.reps_max}` : ''}
                                    </span>

                                    {/* Drop sets */}
                                    {pe.drop_sets > 0 && (
                                      <span className="text-xs text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                                        +{pe.drop_sets} drop set{pe.drop_sets !== 1 ? 's' : ''}
                                      </span>
                                    )}

                                    {/* Suggested weight */}
                                    {pe.suggested_weight_kg > 0 && (
                                      <span className="text-xs text-brand-muted">
                                        ~{pe.suggested_weight_kg} kg
                                      </span>
                                    )}

                                    {/* Rest time */}
                                    {pe.rest_seconds > 0 && (
                                      <span className="text-xs text-brand-muted">
                                        {pe.rest_seconds}s descanso
                                      </span>
                                    )}
                                  </div>

                                  {/* Week notes */}
                                  {pe.week_notes && (
                                    <p className="text-xs text-brand-muted mt-1 italic">{pe.week_notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Iniciar Treino button + phase indicator */}
                    <div className="p-4 pt-3">
                      {currentCfg && (
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: currentCfg.phase_color }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{ color: currentCfg.phase_color }}
                          >
                            {currentCfg.phase} — Semana {currentWeek}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => navigate(`executar/${plan.id}`)}
                        disabled={exercises.length === 0}
                        className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                          exercises.length === 0
                            ? 'bg-brand-secondary text-brand-muted cursor-not-allowed'
                            : 'btn-green'
                        }`}
                      >
                        {exercises.length === 0 ? 'Sem exercícios' : 'Iniciar Treino'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </StudentLayout>
  )
}
