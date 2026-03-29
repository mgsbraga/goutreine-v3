import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '../contexts/auth-context'

// Lazy-loaded feature modules — admin and student bundles split automatically
const LoginPage = lazy(() => import('../features/auth/LoginPage'))
const StudentDashboard = lazy(() => import('../features/student/dashboard/Dashboard'))
const TreinoPage = lazy(() => import('../features/student/workouts/TreinoPage'))
const ExecutarTreino = lazy(() => import('../features/student/workouts/ExecutarTreino'))
const HistoricoPage = lazy(() => import('../features/student/history/HistoricoPage'))
const CalendarioPage = lazy(() => import('../features/student/history/CalendarioPage'))
const ProgressoPage = lazy(() => import('../features/student/progress/ProgressoPage'))
const AdminDashboard = lazy(() => import('../features/admin/dashboard/Dashboard'))
const AdminStudentsPage = lazy(() => import('../features/admin/students/StudentsPage'))
const AdminTreinosPage = lazy(() => import('../features/admin/students/TreinosPage'))
const AdminExercisesPage = lazy(() => import('../features/admin/exercises/ExercisesPage'))
const AdminTemplatesPage = lazy(() => import('../features/admin/templates/TemplatesPage'))
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage'))

function useHashRoute() {
  const [route, setRoute] = useState('login')
  const [params, setParams] = useState({})

  useEffect(() => {
    function handleHashChange() {
      const raw = window.location.hash.replace(/^#\/?/, '') || 'login'
      const parts = raw.split('/').filter(Boolean)

      if (parts[0] === 'admin' && parts.length >= 2 && isNaN(parts[1])) {
        setRoute(parts[0] + '/' + parts[1])
        const p = {}
        if (parts[2]) p.studentId = parts[2]
        if (parts[3]) p.phaseId = parts[3]
        if (!p.studentId && !p.phaseId && parts.length > 2) p.id = parts[2]
        setParams(p)
      } else if (parts.length >= 2) {
        setRoute(parts[0])
        setParams({ id: parts[1] })
      } else {
        setRoute(parts[0])
        setParams({})
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return [route, params]
}

export function navigate(path) {
  const clean = path.replace(/^#?\/?/, '')
  window.location.hash = clean
}

const Fallback = () => (
  <div className="min-h-screen bg-brand-dark flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green" />
  </div>
)

export function Router() {
  const { user, isAdmin, authChecked, dataLoading } = useAuth()
  const [route, params] = useHashRoute()

  // Still checking auth
  if (!authChecked) return <Fallback />

  // Not logged in — redirect to login (except reset-password)
  if (route !== 'login' && route !== 'reset-password' && !user) {
    navigate('login')
    return null
  }

  // Admin route guard
  if (route.startsWith('admin') && !isAdmin) {
    navigate('dashboard')
    return null
  }

  return (
    <>
      {dataLoading && (
        <div className="fixed inset-0 bg-brand-dark bg-opacity-90 flex items-center justify-center z-[100]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4" />
            <p className="text-brand-muted">Carregando dados...</p>
          </div>
        </div>
      )}

      <Suspense fallback={<Fallback />}>
        {route === 'login' && <LoginPage />}
        {route === 'reset-password' && <ResetPasswordPage />}

        {/* Student routes */}
        {route === 'dashboard' && user?.role === 'student' && <StudentDashboard />}
        {route === 'treino' && user?.role === 'student' && <TreinoPage />}
        {route === 'executar' && user?.role === 'student' && <ExecutarTreino planId={params.id} />}
        {route === 'historico' && user?.role === 'student' && <HistoricoPage />}
        {route === 'calendario' && user?.role === 'student' && <CalendarioPage />}
        {route === 'progresso' && user?.role === 'student' && <ProgressoPage />}

        {/* Admin routes */}
        {route === 'dashboard' && user?.role === 'admin' && <AdminDashboard />}
        {(route === 'admin' || route === 'admin/dashboard') && <AdminDashboard />}
        {route === 'admin/alunos' && <AdminStudentsPage params={params} />}
        {route === 'admin/treinos' && <AdminTreinosPage params={params} />}
        {route === 'admin/exercicios' && <AdminExercisesPage />}
        {route === 'admin/templates' && <AdminTemplatesPage />}
      </Suspense>
    </>
  )
}
