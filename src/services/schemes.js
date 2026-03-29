import { sb } from '../lib/supabase'
import { store } from '../shared/constants/store'
import { PERIODIZATION_SCHEMES } from '../shared/constants/periodization-schemes'

// Schemes service — manages custom periodization schemes
// Custom schemes are stored in Supabase `custom_schemes` table
// Built-in schemes come from PERIODIZATION_SCHEMES constant

export function getAllSchemes() {
  const builtIn = PERIODIZATION_SCHEMES.map(s => ({
    ...s,
    type: 'padrao',
  }))
  const custom = (store.custom_schemes || []).map(s => ({
    ...s,
    type: 'custom',
  }))
  return [...builtIn, ...custom]
}

export async function getCustomSchemes() {
  if (!sb) return store.custom_schemes || []
  const { data, error } = await sb.from('custom_schemes').select('*').order('created_at', { ascending: false })
  if (error) {
    console.error('[getCustomSchemes]', error)
    return store.custom_schemes || []
  }
  store.custom_schemes = data || []
  return data || []
}

export async function createScheme({ name, totalWeeks, configs }) {
  const scheme = {
    name,
    total_weeks: totalWeeks,
    configs: JSON.stringify(configs),
    type: 'custom',
  }

  if (!sb) {
    const newId = Math.max(0, ...(store.custom_schemes || []).map(s => s.id)) + 1
    const newScheme = { id: newId, ...scheme, configs, created_at: new Date().toISOString() }
    if (!store.custom_schemes) store.custom_schemes = []
    store.custom_schemes.push(newScheme)
    return newScheme
  }

  const { data, error } = await sb.from('custom_schemes').insert(scheme).select().single()
  if (error) throw error
  const parsed = { ...data, configs: typeof data.configs === 'string' ? JSON.parse(data.configs) : data.configs }
  if (!store.custom_schemes) store.custom_schemes = []
  store.custom_schemes.push(parsed)
  return parsed
}

export async function updateScheme(schemeId, { name, totalWeeks, configs }) {
  const updates = {}
  if (name !== undefined) updates.name = name
  if (totalWeeks !== undefined) updates.total_weeks = totalWeeks
  if (configs !== undefined) updates.configs = JSON.stringify(configs)

  if (!sb) {
    const scheme = (store.custom_schemes || []).find(s => s.id === schemeId)
    if (scheme) {
      if (name !== undefined) scheme.name = name
      if (totalWeeks !== undefined) scheme.total_weeks = totalWeeks
      if (configs !== undefined) scheme.configs = configs
    }
    return scheme
  }

  const { data, error } = await sb.from('custom_schemes').update(updates).eq('id', schemeId).select().single()
  if (error) throw error
  const parsed = { ...data, configs: typeof data.configs === 'string' ? JSON.parse(data.configs) : data.configs }
  const idx = (store.custom_schemes || []).findIndex(s => s.id === schemeId)
  if (idx >= 0) store.custom_schemes[idx] = parsed
  return parsed
}

export async function deleteScheme(schemeId) {
  if (!sb) {
    store.custom_schemes = (store.custom_schemes || []).filter(s => s.id !== schemeId)
    return true
  }
  const { error } = await sb.from('custom_schemes').delete().eq('id', schemeId)
  if (error) throw error
  store.custom_schemes = (store.custom_schemes || []).filter(s => s.id !== schemeId)
  return true
}

export async function duplicateScheme(schemeId) {
  // Can duplicate both built-in and custom schemes
  const allSchemes = getAllSchemes()
  const original = allSchemes.find(s => s.id === schemeId)
  if (!original) return null

  const configs = original.configs || []
  return createScheme({
    name: original.name + ' (cópia)',
    totalWeeks: original.total_weeks,
    configs: configs.map(c => ({ ...c })),
  })
}
