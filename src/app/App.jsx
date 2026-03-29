import { AuthProvider } from '../contexts/auth-context'
import { Router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-brand-dark text-white">
        <Router />
      </div>
    </AuthProvider>
  )
}
