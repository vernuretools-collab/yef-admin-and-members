import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, role: userRole, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && userRole !== role) return <Navigate to={`/${userRole}/dashboard`} replace />
  return children
}