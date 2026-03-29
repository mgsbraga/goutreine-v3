import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'

// --- Templates ---

export async function listTemplates() {
  if (!sb) return store.templates
  const { data } = await sb.from('templates').select('*').order('created_at', { ascending: false })
  return data || []
}

export async function createTemplate({ name, description, totalWeeks, schemeId }) {
  if (!sb) {
    const newId = Math.max(0, ...store.templates.map((t) => t.id)) + 1
    const template = { id: newId, name, description, total_weeks: totalWeeks || 8, scheme_id: schemeId || null, created_at: new Date().toISOString().split('T')[0] }
    store.templates.push(template)
    return template
  }
  const { data, error } = await sb.from('templates')
    .insert({ name, description, total_weeks: totalWeeks || 8, scheme_id: schemeId || null })
    .select().single()
  if (error) throw error
  store.templates.push(data)
  return data
}

export async function updateTemplate(id, updates) {
  if (!sb) {
    const t = store.templates.find((t) => t.id === id)
    if (t) Object.assign(t, updates)
    return t
  }
  const { data, error } = await sb.from('templates').update(updates).eq('id', id).select().single()
  if (error) throw error
  const idx = store.templates.findIndex((t) => t.id === id)
  if (idx >= 0) store.templates[idx] = data
  return data
}

export async function deleteTemplate(id) {
  if (!sb) {
    store.templates = store.templates.filter((t) => t.id !== id)
    return true
  }
  const { error } = await sb.from('templates').delete().eq('id', id)
  if (error) throw error
  store.templates = store.templates.filter((t) => t.id !== id)
  return true
}

// --- Template Plans ---

export async function getTemplatePlans(templateId) {
  if (!sb) return store.template_plans.filter((p) => p.template_id === templateId)
  const { data } = await sb.from('template_plans').select('*').eq('template_id', templateId)
  return data || []
}

export async function createTemplatePlan(templateId, { name, dayLabel }) {
  if (!sb) {
    const newId = Math.max(0, ...store.template_plans.map((p) => p.id)) + 1
    const plan = { id: newId, template_id: templateId, name, day_label: dayLabel, muscle_groups: [] }
    store.template_plans.push(plan)
    return plan
  }
  const { data, error } = await sb.from('template_plans')
    .insert({ template_id: templateId, name, day_label: dayLabel })
    .select().single()
  if (error) throw error
  store.template_plans.push(data)
  return data
}

export async function deleteTemplatePlan(planId) {
  if (!sb) {
    store.template_plans = store.template_plans.filter((p) => p.id !== planId)
    return true
  }
  const { error } = await sb.from('template_plans').delete().eq('id', planId)
  if (error) throw error
  store.template_plans = store.template_plans.filter((p) => p.id !== planId)
  return true
}

// --- Template Exercises ---

export async function getTemplateExercises(templatePlanId) {
  if (!sb) return store.template_exercises.filter((e) => e.template_plan_id === templatePlanId).sort((a, b) => a.order - b.order)
  const { data } = await sb.from('template_exercises').select('*').eq('template_plan_id', templatePlanId).order('exercise_order')
  return (data || []).map((te) => ({ ...te, order: te.exercise_order || te.order || 1 }))
}

export async function addTemplateExercise(templatePlanId, { exerciseId, restSeconds, notes, order }) {
  if (!sb) {
    const newId = Math.max(0, ...store.template_exercises.map((e) => e.id)) + 1
    const te = { id: newId, template_plan_id: templatePlanId, exercise_id: exerciseId, rest_seconds: restSeconds || 90, notes: notes || '', order: order || 1 }
    store.template_exercises.push(te)
    return te
  }
  const { data, error } = await sb.from('template_exercises')
    .insert({ template_plan_id: templatePlanId, exercise_id: exerciseId, rest_seconds: restSeconds || 90, notes: notes || '', exercise_order: order || 1 })
    .select().single()
  if (error) throw error
  store.template_exercises.push({ ...data, order: data.exercise_order })
  return data
}

export async function removeTemplateExercise(templateExerciseId) {
  if (!sb) {
    store.template_exercises = store.template_exercises.filter((e) => e.id !== templateExerciseId)
    return true
  }
  const { error } = await sb.from('template_exercises').delete().eq('id', templateExerciseId)
  if (error) throw error
  store.template_exercises = store.template_exercises.filter((e) => e.id !== templateExerciseId)
  return true
}

// --- Template Week Configs ---

export async function getTemplateWeekConfigs(templateExerciseId) {
  if (!sb) return store.template_week_configs.filter((wc) => wc.template_exercise_id === templateExerciseId)
  const { data } = await sb.from('template_week_configs').select('*').eq('template_exercise_id', templateExerciseId)
  return data || []
}

export async function bulkUpdateTemplateWeekConfigs(templateExerciseId, configs) {
  if (!sb) {
    configs.forEach((cfg) => {
      const existing = store.template_week_configs.find(
        (wc) => wc.template_exercise_id === templateExerciseId && wc.week === cfg.week
      )
      if (existing) Object.assign(existing, cfg)
      else {
        const newId = Math.max(0, ...store.template_week_configs.map((w) => w.id)) + 1
        store.template_week_configs.push({ id: newId, template_exercise_id: templateExerciseId, ...cfg })
      }
    })
    return true
  }
  for (const cfg of configs) {
    await sb.from('template_week_configs')
      .upsert({ template_exercise_id: templateExerciseId, ...cfg }, { onConflict: 'template_exercise_id,week' })
  }
  return true
}
