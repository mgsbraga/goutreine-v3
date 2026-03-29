import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'
import { persistOfflineCache, restoreOfflineCache } from '../lib/offline-cache'

export async function loadSupabaseCache(userId, role) {
  if (!sb) return

  try {
    const { data: mg } = await sb.from('muscle_groups').select('*').order('id')
    store.muscle_groups = mg || []

    const { data: ex } = await sb.from('exercises').select('*').order('id')
    store.exercises = ex || []

    const { data: templates } = await sb.from('templates').select('*').order('created_at', { ascending: false })
    store.templates = templates || []

    const { data: tPlans } = await sb.from('template_plans').select('*')
    store.template_plans = tPlans || []

    const { data: tExercises } = await sb.from('template_exercises').select('*')
    store.template_exercises = (tExercises || []).map((te) => ({ ...te, order: te.exercise_order || te.order || 1 }))

    const { data: twc } = await sb.from('template_week_configs').select('*')
    store.template_week_configs = twc || []

    if (role === 'student') {
      const { data: phases } = await sb.from('training_phases').select('*').eq('student_id', userId)
      store.training_phases = phases || []
      const phaseIds = (phases || []).map((p) => p.id)

      if (phaseIds.length > 0) {
        const { data: plans } = await sb.from('training_plans').select('*').in('phase_id', phaseIds)
        store.training_plans = plans || []
        const planIds = (plans || []).map((p) => p.id)

        if (planIds.length > 0) {
          const { data: pe } = await sb.from('plan_exercises').select('*').in('plan_id', planIds)
          store.plan_exercises = (pe || []).map((p) => ({ ...p, order: p.exercise_order || p.order || 1 }))
          const peIds = (pe || []).map((p) => p.id)

          if (peIds.length > 0) {
            const { data: wc } = await sb.from('week_configs').select('*').in('plan_exercise_id', peIds)
            store.week_configs = wc || []
          }
        }
      }

      const { data: sessions } = await sb.from('workout_sessions').select('*').eq('student_id', userId).order('session_date', { ascending: false })
      store.workout_sessions = (sessions || []).map((s) => ({ ...s, date: s.session_date || s.date }))
      const sessionIds = (sessions || []).map((s) => s.id)

      if (sessionIds.length > 0) {
        const { data: logs } = await sb.from('session_logs').select('*').in('session_id', sessionIds)
        store.session_logs = logs || []
      } else {
        store.session_logs = []
      }
    } else if (role === 'admin') {
      const { data: users } = await sb.from('profiles').select('*')
      store.users = users || []

      const { data: phases } = await sb.from('training_phases').select('*')
      store.training_phases = phases || []

      const { data: plans } = await sb.from('training_plans').select('*')
      store.training_plans = plans || []

      const { data: pe } = await sb.from('plan_exercises').select('*')
      store.plan_exercises = (pe || []).map((p) => ({ ...p, order: p.exercise_order || p.order || 1 }))

      const { data: wc } = await sb.from('week_configs').select('*')
      store.week_configs = wc || []

      const { data: sessions } = await sb.from('workout_sessions').select('*')
      store.workout_sessions = (sessions || []).map((s) => ({ ...s, date: s.session_date || s.date }))

      const { data: logs } = await sb.from('session_logs').select('*')
      store.session_logs = logs || []
    }

    console.log('Cache carregado do Supabase:', {
      muscle_groups: store.muscle_groups.length,
      exercises: store.exercises.length,
      templates: store.templates.length,
      training_phases: store.training_phases.length,
      training_plans: store.training_plans.length,
      workout_sessions: store.workout_sessions.length,
    })

    persistOfflineCache(store)
  } catch (err) {
    console.error('Erro ao carregar cache do Supabase:', err)
    const cached = restoreOfflineCache()
    if (cached) {
      const keys = ['muscle_groups', 'exercises', 'templates', 'template_plans', 'template_exercises',
        'template_week_configs', 'training_phases', 'training_plans', 'plan_exercises',
        'week_configs', 'workout_sessions', 'session_logs', 'users']
      keys.forEach((key) => {
        if (cached[key] && cached[key].length > 0) store[key] = cached[key]
      })
    }
  }
}
