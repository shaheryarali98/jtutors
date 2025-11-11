import { Navigate } from 'react-router-dom'
import { useAuthStore, UserRole } from '../store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  role?: UserRole
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" />
  }

  if (role && user.role !== role && user.role !== 'ADMIN') {
    return <Navigate to="/" />
  }

  return <>{children}</>
}

export default ProtectedRoute

