import { store } from '../constants/store'
import { PERIODIZATION_SCHEMES } from '../constants/periodization-schemes'

export function getActivePhase(studentId) {
  return store.training_phases.find(
    (p) => p.student_id === studentId && p.status === 'active'
  ) || null
}

export function getCurrentWeekForPhase(phase) {
  if (!phase) return 1
  const totalWeeks = phase.total_weeks || 8

  // Get all plans for this phase
  const plans = store.training_plans.filter(p => p.phase_id === phase.id)
  if (plans.length === 0) return 1

  // Get all sessions for these plans, sorted chronologically
  const planIds = new Set(plans.map(p => p.id))
  const sessions = store.workout_sessions
    .filter(s => planIds.has(s.plan_id))
    .sort((a, b) => new Date(a.date || a.session_date) - new Date(b.date || b.session_date))

  if (sessions.length === 0) return 1

  // Count completed rounds: each round requires one session per plan
  let completedRounds = 0
  let remaining = new Set(planIds)

  for (const session of sessions) {
    if (remaining.has(session.plan_id)) {
      remaining.delete(session.plan_id)
    }
    if (remaining.size === 0) {
      completedRounds++
      remaining = new Set(planIds)
    }
  }

  // Week = completed rounds + 1 (current in-progress round), capped at totalWeeks
  return Math.max(1, Math.min(totalWeeks, completedRounds + 1))
}

export function getSchemeForPhase(phase) {
  if (!phase) return PERIODIZATION_SCHEMES[0]
  const totalWeeks = phase.total_weeks || 8
  return phase.scheme_id
    ? PERIODIZATION_SCHEMES.find((s) => s.id === phase.scheme_id)
    : PERIODIZATION_SCHEMES.find((s) => s.total_weeks === totalWeeks) || PERIODIZATION_SCHEMES[0]
}

export function getExerciseName(exerciseId) {
  const exercise = store.exercises.find((e) => e.id === exerciseId)
  return exercise ? exercise.name : ''
}

export function getPlanName(planId) {
  const id = typeof planId === 'string' && !isNaN(planId) ? Number(planId) : planId
  const plan = store.training_plans.find((p) => p.id === id)
  return plan ? plan.name : ''
}

export function getPlanExercises(planId) {
  // plan_id from Supabase is a number, but URL params are strings — coerce both
  const id = typeof planId === 'string' && !isNaN(planId) ? Number(planId) : planId
  return store.plan_exercises
    .filter((pe) => pe.plan_id === id)
    .sort((a, b) => a.order - b.order)
}

export function getPlanExercisesForWeek(planId, weekNumber) {
  const exercises = getPlanExercises(planId)
  return exercises.map((pe) => {
    const wc = store.week_configs.find(
      (c) => c.plan_exercise_id === pe.id && c.week === weekNumber
    )
    return {
      ...pe,
      sets: wc ? wc.sets : 3,
      reps_min: wc ? wc.reps_min : 8,
      reps_max: wc ? wc.reps_max : 12,
      drop_sets: wc ? wc.drop_sets : 0,
      suggested_weight_kg: wc ? wc.suggested_weight_kg : 0,
      week_notes: wc ? wc.notes : '',
    }
  })
}
