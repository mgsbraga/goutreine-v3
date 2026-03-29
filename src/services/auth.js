import { sb } from '../lib/supabase'

export async function signIn(email, password) {
  if (!sb) return null
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!sb) return
  await sb.auth.signOut()
}

export async function getCurrentSession() {
  if (!sb) return null
  const { data: { session } } = await sb.auth.getSession()
  return session
}

export async function resetPassword(email) {
  if (!sb) return
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/#/reset-password',
  })
  if (error) throw error
}

export async function updatePassword(newPassword) {
  if (!sb) return
  const { error } = await sb.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function getProfile(userId) {
  if (!sb) return null
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}
