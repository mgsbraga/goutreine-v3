import { useState } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { navigate } from '../../app/router'
import { isConfigured } from '../../lib/supabase'
import { resetPassword } from '../../services/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!isConfigured) {
        navigate('dashboard')
        return
      }
      const user = await login(email, password)
      const target = user.role === 'admin' ? 'admin' : 'dashboard'
      navigate(target)
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!email.trim()) return setError('Digite seu email acima.')
    setError('')
    setLoading(true)
    try {
      await resetPassword(email.trim())
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.')
      setShowReset(false)
    } catch (err) {
      setError(err.message || 'Erro ao enviar email de recuperação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="card-dark rounded-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="gou-logo">Gou</span>
            <span className="treine-logo">treine</span>
          </h1>
          <p className="text-brand-muted mt-2">Seu rastreador de treinos</p>
        </div>

        <form onSubmit={showReset ? handleReset : handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-secondary border border-brand-muted rounded-lg px-4 py-3 text-white"
              placeholder="seu@email.com"
              required
            />
          </div>
          {!showReset && (
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-secondary border border-brand-muted rounded-lg px-4 py-3 text-white"
                placeholder="••••••••"
                required
              />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-brand-green text-sm">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-green py-3 rounded-lg font-semibold text-lg disabled:opacity-50"
          >
            {loading
              ? (showReset ? 'Enviando...' : 'Entrando...')
              : (showReset ? 'Enviar Email de Recuperação' : 'Entrar')}
          </button>
          <button
            type="button"
            onClick={() => { setShowReset(!showReset); setError(''); setSuccess('') }}
            className="w-full text-sm text-brand-muted hover:text-white transition-colors"
          >
            {showReset ? 'Voltar ao login' : 'Esqueci minha senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
