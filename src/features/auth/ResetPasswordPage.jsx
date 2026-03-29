import { useState } from 'react'
import { navigate } from '../../app/router'
import { updatePassword } from '../../services/auth'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    setError('')
    setLoading(true)
    try {
      await updatePassword(password)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Erro ao atualizar senha')
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
          <p className="text-brand-muted mt-2">Redefinir senha</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-brand-green font-medium">Senha atualizada com sucesso!</p>
            <button
              onClick={() => navigate('login')}
              className="w-full btn-green py-3 rounded-lg font-semibold text-lg"
            >
              Ir para o Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-secondary border border-brand-muted rounded-lg px-4 py-3 text-white"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirmar nova senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-brand-secondary border border-brand-muted rounded-lg px-4 py-3 text-white"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-green py-3 rounded-lg font-semibold text-lg disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
            <button
              type="button"
              onClick={() => navigate('login')}
              className="w-full text-sm text-brand-muted hover:text-white transition-colors"
            >
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
