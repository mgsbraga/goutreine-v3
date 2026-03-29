import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'

// --- Phases ---

export async function getPhasesByStudent(studentId) {
  if (!sb) return store.training_phases.filter((p) => !studentId || p.student_id === studentId)
  const query = sb.from('training_phases').select('*').order('start_date', { ascending: false })
  if (studentId) query.eq('student_id', studentId)
  const { data } = await query
  return data || []
}

export async function createPhase(studentId, { name, startDate, endDate, totalWeeks, status, schemeId, templateId }) {
  if (!sb) {
    const newId = Math.max(0, ...store.training_phases.map((p) => p.id)) + 1
    const phase = {
      id: newId, student_id: studentId, name, start_date: startDate,
      end_date: endDate || '', total_weeks: totalWeeks || 8, status: status || 'planned',
      scheme_id: schemeId || null, template_id: templateId || null,
    }
    store.training_phases.push(phase)
    return phase
  }
  const { data, error } = await sb.from('training_phases').insert({
    student_id: studentId, name, start_date: startDate, end_date: endDate || null,
    total_weeks: totalWeeks || 8, status: status || 'planned',
    scheme_id: schemeId || null, template_id: templateId || null,
  }).select().single()
  if (error) throw error
  store.training_phases.push(data)
  return data
}

export async function updatePhase(phaseId, updates) {
  if (!sb) {
    const phase = store.training_phases.find((p) => p.id === phaseId)
    if (phase) Object.assign(phase, updates)
    return phase
  }
  const { data, error } = await sb.from('training_phases').update(updates).eq('id', phaseId).select().single()
  if (error) throw error
  const idx = store.training_phases.findIndex((p) => p.id === phaseId)
  if (idx >= 0) store.training_phases[idx] = data
  return data
}

export async function deletePhase(phaseId) {
  if (!sb) {
    store.training_phases = store.training_phases.filter((p) => p.id !== phaseId)
    return true
  }
  const { error } = await sb.from('training_phases').delete().eq('id', phaseId)
  if (error) throw error
  store.training_phases = store.training_phases.filter((p) => p.id !== phaseId)
  return true
}

// --- Plans ---

export async function getPlansByPhase(phaseId) {
  if (!sb) return store.training_plans.filter((p) => p.phase_id === phaseId)
  const { data } = await sb.from('training_plans')
    .select('*, training_plan_muscle_groups(muscle_group_id)')
    .eq('phase_id', phaseId).order('name')
  return (data || []).map((p) => ({
    ...p,
    muscle_groups: (p.training_plan_muscle_groups || []).map((t) => t.muscle_group_id),
  }))
}

export async function createPlan(phaseId, { name, dayLabel, muscleGroups }) {
  if (!sb) {
    const newId = Math.max(0, ...store.training_plans.map((p) => p.id)) + 1
    const plan = { id: newId, phase_id: phaseId, name, day_label: dayLabel, muscle_groups: muscleGroups || [] }
    store.training_plans.push(plan)
    return plan
  }
  const { data, error } = await sb.from('training_plans')
    .insert({ phase_id: phaseId, name, day_label: dayLabel, muscle_groups: muscleGroups || [] })
    .select().single()
  if (error) throw error
  store.training_plans.push(data)
  return data
}

export async function deletePlan(planId) {
  if (!sb) {
    store.training_plans = store.training_plans.filter((p) => p.id !== planId)
    return true
  }
  const { error } = await sb.from('training_plans').delete().eq('id', planId)
  if (error) throw error
  store.training_plans = store.training_plans.filter((p) => p.id !== planId)
  return true
}

// --- Plan Exercises ---

export async function getExercisesByPlan(planId) {
  if (!sb) return store.plan_exercises.filter((pe) => pe.plan_id === planId).sort((a, b) => a.order - b.order)
  const { data } = await sb.from('plan_exercises')
    .select('*, exercises(name, muscle_group_id, description)')
    .eq('plan_id', planId).order('exercise_order')
  return data || []
}

export async function addExerciseToPlan(planId, { exerciseId, restSeconds, notes, order, supersetGroup }) {
  if (!sb) {
    const newId = Math.max(0, ...store.plan_exercises.map((p) => p.id)) + 1
    const pe = {
      id: newId, plan_id: planId, exercise_id: exerciseId,
      rest_seconds: restSeconds || 90, notes: notes || '', order: order || 1,
      superset_group: supersetGroup ?? null,
    }
    store.plan_exercises.push(pe)
    return pe
  }
  const { data, error } = await sb.from('plan_exercises').insert({
    plan_id: planId, exercise_id: exerciseId,
    rest_seconds: restSeconds || 90, notes: notes || '',
    exercise_order: order || 1, superset_group: supersetGroup ?? null,
  }).select().single()
  if (error) throw error
  store.plan_exercises.push({ ...data, order: data.exercise_order || order })
  return data
}

export async function removePlanExercise(planExerciseId) {
  if (!sb) {
    store.plan_exercises = store.plan_exercises.filter((pe) => pe.id !== planExerciseId)
    return true
  }
  const { error } = await sb.from('plan_exercises').delete().eq('id', planExerciseId)
  if (error) throw error
  store.plan_exercises = store.plan_exercises.filter((pe) => pe.id !== planExerciseId)
  return true
}

// --- Week Configs ---

export async function bulkUpdateWeekConfigs(planExerciseId, configs) {
  if (!sb) {
    configs.forEach((cfg) => {
      const existing = store.week_configs.find(
        (wc) => wc.plan_exercise_id === planExerciseId && wc.week === cfg.week
      )
      if (existing) {
        Object.assign(existing, cfg)
      } else {
        const newId = Math.max(0, ...store.week_configs.map((w) => w.id)) + 1
        store.week_configs.push({ id: newId, plan_exercise_id: planExerciseId, ...cfg })
      }
    })
    return true
  }
  for (const cfg of configs) {
    const { data, error } = await sb.from('week_configs')
      .upsert({ plan_exercise_id: planExerciseId, ...cfg }, { onConflict: 'plan_exercise_id,week' })
      .select().single()
    if (error) throw error
    if (data) {
      const idx = store.week_configs.findIndex(
        (wc) => wc.plan_exercise_id === planExerciseId && wc.week === cfg.week
      )
      if (idx >= 0) store.week_configs[idx] = data
      else store.week_configs.push(data)
    }
  }
  return true
}

// --- High-level: Apply Template ---

export async function applyTemplateToStudent(templateId, studentId, { name, startDate, endDate }) {
  const template = store.templates.find((t) => t.id === templateId)
  if (!template) return null

  if (sb) {
    const { data: newPhase, error: phaseErr } = await sb.from('training_phases').insert({
      student_id: studentId, name: name || template.name,
      start_date: startDate, end_date: endDate || null,
      total_weeks: template.total_weeks, status: 'planned', template_id: templateId,
    }).select().single()
    if (phaseErr) throw phaseErr
    store.training_phases.push(newPhase)

    const tPlans = store.template_plans.filter((p) => p.template_id === templateId)
    for (const tp of tPlans) {
      const { data: newPlan, error: planErr } = await sb.from('training_plans').insert({
        phase_id: newPhase.id, name: tp.name, day_label: tp.day_label, muscle_groups: tp.muscle_groups,
      }).select().single()
      if (planErr) throw planErr
      store.training_plans.push(newPlan)

      const tExercises = store.template_exercises
        .filter((e) => e.template_plan_id === tp.id)
        .sort((a, b) => a.order - b.order)
      for (const te of tExercises) {
        const { data: newPe, error: peErr } = await sb.from('plan_exercises').insert({
          plan_id: newPlan.id, exercise_id: te.exercise_id,
          rest_seconds: te.rest_seconds, notes: te.notes, exercise_order: te.order,
        }).select().single()
        if (peErr) throw peErr
        store.plan_exercises.push({ ...newPe, order: newPe.exercise_order || te.order })

        const tWeekConfigs = store.template_week_configs.filter((wc) => wc.template_exercise_id === te.id)
        if (tWeekConfigs.length > 0) {
          const wcRows = tWeekConfigs.map((twc) => ({
            plan_exercise_id: newPe.id, week: twc.week, sets: twc.sets,
            reps_min: twc.reps_min, reps_max: twc.reps_max,
            drop_sets: twc.drop_sets, suggested_weight_kg: twc.suggested_weight_kg, notes: twc.notes,
          }))
          const { data: newWcs, error: wcErr } = await sb.from('week_configs').insert(wcRows).select()
          if (wcErr) throw wcErr
          store.week_configs.push(...(newWcs || []))
        }
      }
    }
    return newPhase
  }

  // Mock mode
  const newPhaseId = Math.max(0, ...store.training_phases.map((p) => p.id)) + 1
  const newPhase = {
    id: newPhaseId, student_id: studentId, name: name || template.name,
    start_date: startDate, end_date: endDate || '', total_weeks: template.total_weeks, status: 'planned',
  }
  store.training_phases.push(newPhase)

  const tPlans = store.template_plans.filter((p) => p.template_id === templateId)
  tPlans.forEach((tp) => {
    const newPlanId = Math.max(0, ...store.training_plans.map((p) => p.id)) + 1
    store.training_plans.push({
      id: newPlanId, phase_id: newPhaseId, name: tp.name,
      day_label: tp.day_label, muscle_groups: [...(tp.muscle_groups || [])],
    })
    const tExercises = store.template_exercises.filter((e) => e.template_plan_id === tp.id).sort((a, b) => a.order - b.order)
    tExercises.forEach((te) => {
      const newPeId = Math.max(0, ...store.plan_exercises.map((p) => p.id)) + 1
      store.plan_exercises.push({
        id: newPeId, plan_id: newPlanId, exercise_id: te.exercise_id,
        rest_seconds: te.rest_seconds, notes: te.notes, order: te.order,
      })
      const tWeekConfigs = store.template_week_configs.filter((wc) => wc.template_exercise_id === te.id)
      tWeekConfigs.forEach((twc) => {
        const newWcId = Math.max(0, ...store.week_configs.map((w) => w.id)) + 1
        store.week_configs.push({
          id: newWcId, plan_exercise_id: newPeId, week: twc.week,
          sets: twc.sets, reps_min: twc.reps_min, reps_max: twc.reps_max,
          drop_sets: twc.drop_sets, suggested_weight_kg: twc.suggested_weight_kg, notes: twc.notes,
        })
      })
    })
  })
  return newPhase
}

// --- High-level: Copy Phase to Other Students ---

export async function copyPhaseToStudents(phaseId, studentIds) {
  const phase = store.training_phases.find((p) => p.id === phaseId)
  if (!phase) return []

  const srcPlans = store.training_plans.filter((p) => p.phase_id === phaseId)
  const results = []

  for (const studentId of studentIds) {
    if (sb) {
      const { data: newPhase, error: phaseErr } = await sb.from('training_phases').insert({
        student_id: studentId, name: phase.name,
        start_date: phase.start_date, end_date: phase.end_date || null,
        total_weeks: phase.total_weeks, status: 'planned',
        scheme_id: phase.scheme_id || null,
      }).select().single()
      if (phaseErr) throw phaseErr
      store.training_phases.push(newPhase)

      for (const sp of srcPlans) {
        const { data: newPlan, error: planErr } = await sb.from('training_plans').insert({
          phase_id: newPhase.id, name: sp.name, day_label: sp.day_label, muscle_groups: sp.muscle_groups,
        }).select().single()
        if (planErr) throw planErr
        store.training_plans.push(newPlan)

        const srcExercises = store.plan_exercises
          .filter((pe) => pe.plan_id === sp.id)
          .sort((a, b) => (a.order || a.exercise_order || 0) - (b.order || b.exercise_order || 0))
        for (const se of srcExercises) {
          const { data: newPe, error: peErr } = await sb.from('plan_exercises').insert({
            plan_id: newPlan.id, exercise_id: se.exercise_id,
            rest_seconds: se.rest_seconds, notes: se.notes,
            exercise_order: se.order || se.exercise_order || 1,
            superset_group: se.superset_group || null,
          }).select().single()
          if (peErr) throw peErr
          store.plan_exercises.push({ ...newPe, order: newPe.exercise_order || se.order })

          const srcWcs = store.week_configs.filter((wc) => wc.plan_exercise_id === se.id)
          if (srcWcs.length > 0) {
            const wcRows = srcWcs.map((wc) => ({
              plan_exercise_id: newPe.id, week: wc.week, sets: wc.sets,
              reps_min: wc.reps_min, reps_max: wc.reps_max,
              drop_sets: wc.drop_sets, suggested_weight_kg: wc.suggested_weight_kg, notes: wc.notes,
            }))
            const { data: newWcs, error: wcErr } = await sb.from('week_configs').insert(wcRows).select()
            if (wcErr) throw wcErr
            store.week_configs.push(...(newWcs || []))
          }
        }
      }
      results.push(newPhase)
    } else {
      // Mock mode
      const newPhaseId = Math.max(0, ...store.training_phases.map((p) => p.id)) + 1
      const newPhase = {
        id: newPhaseId, student_id: studentId, name: phase.name,
        start_date: phase.start_date, end_date: phase.end_date || '',
        total_weeks: phase.total_weeks, status: 'planned', scheme_id: phase.scheme_id || null,
      }
      store.training_phases.push(newPhase)

      for (const sp of srcPlans) {
        const newPlanId = Math.max(0, ...store.training_plans.map((p) => p.id)) + 1
        store.training_plans.push({
          id: newPlanId, phase_id: newPhaseId, name: sp.name,
          day_label: sp.day_label, muscle_groups: [...(sp.muscle_groups || [])],
        })
        const srcExercises = store.plan_exercises
          .filter((pe) => pe.plan_id === sp.id)
          .sort((a, b) => (a.order || a.exercise_order || 0) - (b.order || b.exercise_order || 0))
        srcExercises.forEach((se) => {
          const newPeId = Math.max(0, ...store.plan_exercises.map((p) => p.id)) + 1
          store.plan_exercises.push({
            id: newPeId, plan_id: newPlanId, exercise_id: se.exercise_id,
            rest_seconds: se.rest_seconds, notes: se.notes, order: se.order,
            superset_group: se.superset_group || null,
          })
          const srcWcs = store.week_configs.filter((wc) => wc.plan_exercise_id === se.id)
          srcWcs.forEach((wc) => {
            const newWcId = Math.max(0, ...store.week_configs.map((w) => w.id)) + 1
            store.week_configs.push({
              id: newWcId, plan_exercise_id: newPeId, week: wc.week,
              sets: wc.sets, reps_min: wc.reps_min, reps_max: wc.reps_max,
              drop_sets: wc.drop_sets, suggested_weight_kg: wc.suggested_weight_kg, notes: wc.notes,
            })
          })
        })
      }
      results.push(newPhase)
    }
  }
  return results
}

// --- High-level: Save Phase as Template ---

export async function savePhaseAsTemplate(phaseId, { name, description }) {
  const phase = store.training_phases.find((p) => p.id === phaseId)
  if (!phase) return null

  const srcPlans = store.training_plans.filter((p) => p.phase_id === phaseId)

  if (sb) {
    const { data: newTemplate, error: tErr } = await sb.from('templates').insert({
      name, description: description || null, total_weeks: phase.total_weeks, scheme_id: phase.scheme_id || null,
    }).select().single()
    if (tErr) throw tErr
    store.templates.push(newTemplate)

    for (const sp of srcPlans) {
      const { data: newTp, error: tpErr } = await sb.from('template_plans').insert({
        template_id: newTemplate.id, name: sp.name, day_label: sp.day_label, muscle_groups: sp.muscle_groups,
      }).select().single()
      if (tpErr) throw tpErr
      store.template_plans.push(newTp)

      const srcExercises = store.plan_exercises
        .filter((pe) => pe.plan_id === sp.id)
        .sort((a, b) => (a.order || a.exercise_order || 0) - (b.order || b.exercise_order || 0))
      for (const se of srcExercises) {
        const { data: newTe, error: teErr } = await sb.from('template_exercises').insert({
          template_plan_id: newTp.id, exercise_id: se.exercise_id,
          rest_seconds: se.rest_seconds, notes: se.notes, exercise_order: se.order || se.exercise_order || 1,
        }).select().single()
        if (teErr) throw teErr
        store.template_exercises.push({ ...newTe, order: newTe.exercise_order || se.order })

        const srcWcs = store.week_configs.filter((wc) => wc.plan_exercise_id === se.id)
        if (srcWcs.length > 0) {
          const wcRows = srcWcs.map((wc) => ({
            template_exercise_id: newTe.id, week: wc.week, sets: wc.sets,
            reps_min: wc.reps_min, reps_max: wc.reps_max,
            drop_sets: wc.drop_sets, suggested_weight_kg: wc.suggested_weight_kg, notes: wc.notes,
          }))
          const { data: newWcs, error: wcErr } = await sb.from('template_week_configs').insert(wcRows).select()
          if (wcErr) throw wcErr
          store.template_week_configs.push(...(newWcs || []))
        }
      }
    }
    return newTemplate
  }

  // Mock mode
  const newTemplateId = Math.max(0, ...store.templates.map((t) => t.id)) + 1
  const newTemplate = {
    id: newTemplateId, name, description: description || '',
    total_weeks: phase.total_weeks, scheme_id: phase.scheme_id || null,
    created_at: new Date().toISOString().split('T')[0],
  }
  store.templates.push(newTemplate)

  for (const sp of srcPlans) {
    const newTpId = Math.max(0, ...store.template_plans.map((p) => p.id)) + 1
    store.template_plans.push({
      id: newTpId, template_id: newTemplateId, name: sp.name,
      day_label: sp.day_label, muscle_groups: [...(sp.muscle_groups || [])],
    })
    const srcExercises = store.plan_exercises
      .filter((pe) => pe.plan_id === sp.id)
      .sort((a, b) => (a.order || a.exercise_order || 0) - (b.order || b.exercise_order || 0))
    srcExercises.forEach((se) => {
      const newTeId = Math.max(0, ...store.template_exercises.map((e) => e.id)) + 1
      store.template_exercises.push({
        id: newTeId, template_plan_id: newTpId, exercise_id: se.exercise_id,
        rest_seconds: se.rest_seconds, notes: se.notes, order: se.order,
      })
      const srcWcs = store.week_configs.filter((wc) => wc.plan_exercise_id === se.id)
      srcWcs.forEach((wc) => {
        const newWcId = Math.max(0, ...store.template_week_configs.map((w) => w.id)) + 1
        store.template_week_configs.push({
          id: newWcId, template_exercise_id: newTeId, week: wc.week,
          sets: wc.sets, reps_min: wc.reps_min, reps_max: wc.reps_max,
          drop_sets: wc.drop_sets, suggested_weight_kg: wc.suggested_weight_kg, notes: wc.notes,
        })
      })
    })
  }
  return newTemplate
}
