import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'
import { queueOfflineWrite, getOfflineQueue, saveOfflineQueue } from '../lib/offline-cache'

export async function startSession(studentId, planId) {
  return createSession(studentId, planId, 0, '')
}

export async function createSession(studentId, planId, durationMinutes, notes) {
  const today = new Date().toISOString().split('T')[0]
  const tempId = '_temp_' + Date.now()
  const startedAt = new Date(Date.now() - durationMinutes * 60000).toISOString()
  const finishedAt = new Date().toISOString()

  const sessionPayload = {
    student_id: studentId,
    plan_id: planId,
    session_date: today,
    duration_minutes: durationMinutes,
    notes: notes || '',
    started_at: startedAt,
    finished_at: finishedAt,
  }

  // Try Supabase first
  if (sb) {
    try {
      const { data, error } = await sb.from('workout_sessions')
        .insert(sessionPayload).select().single()
      if (error) throw error
      const cached = { ...data, date: data.session_date || data.date }
      store.workout_sessions.unshift(cached)
      return cached
    } catch (err) {
      console.warn('[Offline] createSession falhou, enfileirando:', err.message)
      // Fall through to offline queue
    }
  }

  // Offline: save to queue + in-memory store
  const localSession = { id: tempId, ...sessionPayload, date: today }
  store.workout_sessions.unshift(localSession)
  queueOfflineWrite({ type: 'create_session', tempId, payload: sessionPayload })
  return localSession
}

export async function logSets(sessionId, logs) {
  const isTemp = typeof sessionId === 'string' && sessionId.startsWith('_temp_')

  // Try Supabase first (only if session has a real ID)
  if (sb && !isTemp) {
    try {
      const rows = logs.map((log) => ({ session_id: sessionId, ...log }))
      const { data, error } = await sb.from('session_logs').insert(rows).select()
      if (error) throw error
      store.session_logs.push(...(data || []))
      return data
    } catch (err) {
      console.warn('[Offline] logSets falhou, enfileirando:', err.message)
      // Fall through to offline queue
    }
  }

  // Offline: save to queue + in-memory store
  logs.forEach((log, i) => {
    store.session_logs.push({
      id: store.session_logs.length + 100 + i,
      session_id: sessionId,
      ...log,
    })
  })
  queueOfflineWrite({ type: 'log_sets', tempSessionId: sessionId, payload: { logs } })
  return logs
}

// ─── Sync offline queue to Supabase ──────────────────────────────────────────

export async function syncOfflineQueue() {
  if (!sb) return { synced: 0, failed: 0 }

  const queue = getOfflineQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  console.log(`[Sync] Sincronizando ${queue.length} operações pendentes...`)

  // Map tempId → real Supabase ID
  const idMap = {}
  let synced = 0
  let failed = 0
  const remaining = []

  for (const item of queue) {
    try {
      if (item.type === 'create_session') {
        const { data, error } = await sb.from('workout_sessions')
          .insert(item.payload).select().single()
        if (error) throw error
        idMap[item.tempId] = data.id
        // Update in-memory store: replace temp session with real one
        const idx = store.workout_sessions.findIndex(s => s.id === item.tempId)
        if (idx >= 0) store.workout_sessions[idx] = { ...data, date: data.session_date || data.date }
        synced++
      } else if (item.type === 'log_sets') {
        const realSessionId = idMap[item.tempSessionId] || item.tempSessionId
        // Skip if we still don't have a real ID (session sync failed)
        if (typeof realSessionId === 'string' && realSessionId.startsWith('_temp_')) {
          remaining.push(item)
          failed++
          continue
        }
        const rows = item.payload.logs.map(log => ({ session_id: realSessionId, ...log }))
        const { data, error } = await sb.from('session_logs').insert(rows).select()
        if (error) throw error
        // Update in-memory store: replace temp logs
        const tempLogs = store.session_logs.filter(l => l.session_id === item.tempSessionId)
        for (const tl of tempLogs) {
          const idx = store.session_logs.indexOf(tl)
          if (idx >= 0) store.session_logs.splice(idx, 1)
        }
        store.session_logs.push(...(data || []))
        synced++
      }
    } catch (err) {
      console.error('[Sync] Erro ao sincronizar:', item.type, err.message)
      remaining.push(item)
      failed++
    }
  }

  saveOfflineQueue(remaining)
  console.log(`[Sync] Concluído: ${synced} sincronizados, ${failed} falharam`)
  return { synced, failed }
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
