import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'

export async function startSession(studentId, planId) {
  return createSession(studentId, planId, 0, '')
}

export async function createSession(studentId, planId, durationMinutes, notes) {
  const today = new Date().toISOString().split('T')[0]
  if (!sb) {
    const newSession = {
      id: store.workout_sessions.length + 100,
      student_id: studentId,
      plan_id: planId,
      date: today,
      notes: notes || '',
      duration_minutes: durationMinutes,
    }
    store.workout_sessions.unshift(newSession)
    return newSession
  }
  const { data, error } = await sb.from('workout_sessions').insert({
    student_id: studentId,
    plan_id: planId,
    session_date: today,
    duration_minutes: durationMinutes,
    notes: notes || '',
    started_at: new Date(Date.now() - durationMinutes * 60000).toISOString(),
    finished_at: new Date().toISOString(),
  }).select().single()
  if (error) throw error
  const cached = { ...data, date: data.session_date || data.date }
  store.workout_sessions.unshift(cached)
  return cached
}

export async function logSets(sessionId, logs) {
  if (!sb) {
    logs.forEach((log, i) => {
      store.session_logs.push({
        id: store.session_logs.length + 100 + i,
        session_id: sessionId,
        ...log,
      })
    })
    return logs
  }
  const rows = logs.map((log) => ({ session_id: sessionId, ...log }))
  const { data, error } = await sb.from('session_logs').insert(rows).select()
  if (error) throw error
  store.session_logs.push(...(data || []))
  return data
}

export async function getSessionsByStudent(studentId, { days } = {}) {
  if (!sb) return store.workout_sessions.filter((s) => s.student_id === studentId || !studentId)
  const query = sb.from('workout_sessions')
    .select('*, training_plans(name)')
    .order('session_date', { ascending: false })
  if (studentId) query.eq('student_id', studentId)
  if (days) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    query.gte('session_date', cutoff.toISOString().split('T')[0])
  }
  const { data } = await query
  return data || []
}

export async function getSessionLogs(sessionId) {
  if (!sb) return store.session_logs.filter((l) => l.session_id === sessionId)
  const { data } = await sb.from('session_logs')
    .select('*, exercises(name, muscle_group_id)')
    .eq('session_id', sessionId)
    .order('exercise_id').order('set_number')
  return data || []
}

export async function getAllSessionLogs(studentId, { days } = {}) {
  if (!sb) {
    const sessionIds = store.workout_sessions
      .filter((s) => !studentId || s.student_id === studentId)
      .map((s) => s.id)
    return store.session_logs.filter((l) => sessionIds.includes(l.session_id))
  }
  const query = sb.from('session_logs')
    .select('*, workout_sessions!inner(student_id, session_date, plan_id)')
    .order('created_at')
  if (studentId) query.eq('workout_sessions.student_id', studentId)
  if (days) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    query.gte('workout_sessions.session_date', cutoff.toISOString().split('T')[0])
  }
  const { data } = await query
  return data || []
}

export async function getPersonalRecords(studentId) {
  if (!sb) return []
  const { data } = await sb.from('v_personal_records').select('*').eq('student_id', studentId)
  return data || []
}
