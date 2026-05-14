import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, UserRole } from '../store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  role?: UserRole
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (role && user.role !== role && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

