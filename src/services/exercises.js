import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'

export async function listExercises() {
  if (!sb) return store.exercises
  const { data } = await sb.from('exercises').select('*, muscle_groups(name)').order('name')
  return data || []
}

export async function listMuscleGroups() {
  if (!sb) return store.muscle_groups
  const { data } = await sb.from('muscle_groups').select('*').order('id')
  return data || []
}

// Derive primary muscle_group_id from activations (highest %)
function derivePrimaryGroup(activations, fallbackGroupId) {
  if (!activations || activations.length === 0) return fallbackGroupId
  const sorted = [...activations].sort((a, b) => b.pct - a.pct)
  return sorted[0].group_id
}

export async function createExercise({ name, muscleGroupId, description, activations }) {
  // If activations provided, derive muscle_group_id from highest %
  const finalActivations = activations && activations.length > 0 ? activations : null
  const finalGroupId = finalActivations
    ? derivePrimaryGroup(finalActivations, muscleGroupId)
    : muscleGroupId

  if (!sb) {
    const ex = {
      id: store.exercises.length + 100, name,
      muscle_group_id: finalGroupId, description,
      muscle_activations: finalActivations,
    }
    store.exercises.push(ex)
    return ex
  }
  // Try with muscle_activations first, fallback without if column doesn't exist
  const payload = {
    name, muscle_group_id: finalGroupId, description,
    muscle_activations: finalActivations,
  }
  let { data, error } = await sb.from('exercises').insert(payload).select().single()
  if (error && error.message?.includes('muscle_activations')) {
    // Column doesn't exist yet — insert without it
    const { data: d2, error: e2 } = await sb.from('exercises')
      .insert({ name, muscle_group_id: finalGroupId, description })
      .select().single()
    if (e2) throw e2
    data = { ...d2, muscle_activations: finalActivations }
  } else if (error) {
    throw error
  }
  if (data.muscle_activations && typeof data.muscle_activations === 'string') {
    try { data.muscle_activations = JSON.parse(data.muscle_activations) } catch {}
  }
  store.exercises.push(data)
  return data
}

export async function updateExercise(id, { name, muscleGroupId, description, activations }) {
  const finalActivations = activations && activations.length > 0 ? activations : null
  const finalGroupId = finalActivations
    ? derivePrimaryGroup(finalActivations, muscleGroupId)
    : muscleGroupId

  if (!sb) {
    const ex = store.exercises.find((e) => e.id === id)
    if (ex) {
      ex.name = name
      ex.muscle_group_id = finalGroupId
      ex.description = description
      ex.muscle_activations = finalActivations
    }
    return ex
  }
  const payload = {
    name, muscle_group_id: finalGroupId, description,
    muscle_activations: finalActivations,
  }
  let { data, error } = await sb.from('exercises').update(payload).eq('id', id).select().single()
  if (error && error.message?.includes('muscle_activations')) {
    const { data: d2, error: e2 } = await sb.from('exercises')
      .update({ name, muscle_group_id: finalGroupId, description })
      .eq('id', id).select().single()
    if (e2) throw e2
    data = { ...d2, muscle_activations: finalActivations }
  } else if (error) {
    throw error
  }
  if (data.muscle_activations && typeof data.muscle_activations === 'string') {
    try { data.muscle_activations = JSON.parse(data.muscle_activations) } catch {}
  }
  // Ensure activations are in local store even if Supabase didn't persist them
  if (!data.muscle_activations && finalActivations) data.muscle_activations = finalActivations
  const idx = store.exercises.findIndex((e) => e.id === id)
  if (idx >= 0) store.exercises[idx] = data
  return data
}

export async function deleteExercise(id) {
  if (!sb) {
    store.exercises = store.exercises.filter((e) => e.id !== id)
    return true
  }
  const { error } = await sb.from('exercises').delete().eq('id', id)
  if (error) throw error
  store.exercises = store.exercises.filter((e) => e.id !== id)
  return true
}
