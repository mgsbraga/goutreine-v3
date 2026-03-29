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
