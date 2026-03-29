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

export async function createExercise({ name, muscleGroupId, description }) {
  if (!sb) {
    const ex = { id: store.exercises.length + 100, name, muscle_group_id: muscleGroupId, description }
    store.exercises.push(ex)
    return ex
  }
  const { data, error } = await sb.from('exercises')
    .insert({ name, muscle_group_id: muscleGroupId, description })
    .select().single()
  if (error) throw error
  store.exercises.push(data)
  return data
}

export async function updateExercise(id, { name, muscleGroupId, description }) {
  if (!sb) {
    const ex = store.exercises.find((e) => e.id === id)
    if (ex) { ex.name = name; ex.muscle_group_id = muscleGroupId; ex.description = description }
    return ex
  }
  const { data, error } = await sb.from('exercises')
    .update({ name, muscle_group_id: muscleGroupId, description })
    .eq('id', id).select().single()
  if (error) throw error
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
