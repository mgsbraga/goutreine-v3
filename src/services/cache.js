import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'
import { persistOfflineCache, restoreOfflineCache } from '../lib/offline-cache'

// Groups/exercises to seed into Supabase on admin login
const SEED_MUSCLE_GROUPS = [
  { name: 'Cardio', icon: 'cardio' },
  { name: 'Core', icon: 'core' },
]
const SEED_EXERCISES = [
  { name: 'Bike', group: 'Cardio', description: 'Bicicleta ergométrica' },
  { name: 'Remo Ergômetro', group: 'Cardio', description: 'Remo ergômetro' },
  { name: 'Transport', group: 'Cardio', description: 'Transport / elíptico' },
  { name: 'S-Force', group: 'Cardio', description: 'S-Force / air bike' },
  { name: 'Esteira', group: 'Cardio', description: 'Caminhada ou corrida' },
  { name: 'Escada', group: 'Cardio', description: 'Simulador de escada' },
  { name: 'Abdominal Crunch', group: 'Core', description: 'Abdominal tradicional' },
  { name: 'Prancha', group: 'Core', description: 'Prancha isométrica' },
  { name: 'Abdominal Infra', group: 'Core', description: 'Elevação de pernas' },
  { name: 'Russian Twist', group: 'Core', description: 'Rotação com carga para oblíquos' },
  { name: 'Abdominal na Roda', group: 'Core', description: 'Roda abdominal / ab wheel' },
]

async function seedGroupsAndExercises(mgList, exList) {
  // Seed missing muscle groups into Supabase
  for (const seed of SEED_MUSCLE_GROUPS) {
    if (!mgList.some(g => g.name === seed.name)) {
      try {
        const { data, error } = await sb.from('muscle_groups').insert(seed).select().single()
        if (!error && data) mgList.push(data)
      } catch (e) { console.warn('[Seed] muscle_group:', seed.name, e.message) }
    }
  }
  // Seed missing exercises into Supabase (using real group IDs from Supabase)
  for (const seed of SEED_EXERCISES) {
    if (!exList.some(e => e.name === seed.name)) {
      const group = mgList.find(g => g.name === seed.group)
      if (!group) continue
      try {
        const { data, error } = await sb.from('exercises')
          .insert({ name: seed.name, muscle_group_id: group.id, description: seed.description })
          .select().single()
        if (!error && data) exList.push(data)
      } catch (e) { console.warn('[Seed] exercise:', seed.name, e.message) }
    }
  }
}

export async function loadSupabaseCache(userId, role) {
  if (!sb) return

  try {
    const { data: mg } = await sb.from('muscle_groups').select('*').order('id')
    const { data: ex } = await sb.from('exercises').select('*').order('id')

    const mgList = mg || []
    // Parse muscle_activations jsonb (may come as string from Supabase)
    const exList = (ex || []).map(e => {
      if (e.muscle_activations && typeof e.muscle_activations === 'string') {
        try { e.muscle_activations = JSON.parse(e.muscle_activations) } catch {}
      }
      return e
    })

    // Admin login: seed Cardio/Core into Supabase if missing
    if (role === 'admin') {
      await seedGroupsAndExercises(mgList, exList)
    }

    store.muscle_groups = mgList
    store.exercises = exList

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
