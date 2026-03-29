import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'

export async function getMyProfile(userId) {
  if (!sb) return store.users.find((u) => u.id === userId) || null
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function getStudentProfile(studentId) {
  if (!sb) return store.users.find((u) => u.id === studentId) || null
  const { data, error } = await sb.from('profiles').select('*').eq('id', studentId).single()
  if (error) throw error
  return data
}

export async function getAllStudents() {
  if (!sb) return store.users.filter((u) => u.role === 'student')
  const { data } = await sb.from('profiles').select('*').eq('role', 'student').order('name')
  return data || []
}
