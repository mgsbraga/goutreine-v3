import { store } from '../constants/store'

const MUSCLE_COLORS = {
  1: 'muscle-peito',
  2: 'muscle-costas',
  3: 'muscle-quadriceps',
  4: 'muscle-ombros',
  5: 'muscle-biceps',
  6: 'muscle-triceps',
  7: 'muscle-gluteo',
  8: 'muscle-posterior',
  9: 'muscle-panturrilha',
  10: 'muscle-cardio',
  11: 'muscle-core',
}

export function getMuscleGroupColor(groupId) {
  return MUSCLE_COLORS[groupId] || 'muscle-peito'
}

export function getMuscleGroupName(groupId) {
  const group = store.muscle_groups.find((g) => g.id === groupId)
  return group ? group.name : ''
}

// Returns normalized activations array for any exercise (retrocompatible)
// Always returns at least [{ group_id, pct: 100 }] from muscle_group_id
export function getExerciseActivations(exercise) {
  if (!exercise) return []
  if (exercise.muscle_activations && Array.isArray(exercise.muscle_activations) && exercise.muscle_activations.length > 0) {
    return exercise.muscle_activations.sort((a, b) => b.pct - a.pct)
  }
  // Parse JSON string if needed
  if (typeof exercise.muscle_activations === 'string') {
    try {
      const parsed = JSON.parse(exercise.muscle_activations)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.sort((a, b) => b.pct - a.pct)
    } catch {}
  }
  // Fallback: single group at 100%
  if (exercise.muscle_group_id) {
    return [{ group_id: exercise.muscle_group_id, pct: 100 }]
  }
  return []
}

// Returns the primary muscle group ID (highest activation %)
export function getPrimaryMuscleGroup(exercise) {
  const activations = getExerciseActivations(exercise)
  return activations.length > 0 ? activations[0].group_id : exercise?.muscle_group_id || null
}

// Check if exercise has a given muscle group at any activation level
export function exerciseHasMuscleGroup(exercise, groupId) {
  const activations = getExerciseActivations(exercise)
  return activations.some(a => a.group_id === groupId)
}
