import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import TutorDashboard from './pages/tutor/TutorDashboard'
import TutorProfile from './pages/tutor/TutorProfile'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentProfile from './pages/student/StudentProfile'
import HomePage from './pages/HomePage'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { User } from './store/authStore'

function App() {
  const { user } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={
            user ? <Navigate to={resolveDefaultRoute(user)} /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to={resolveDefaultRoute(user)} /> : <Register />
          }
        />
        
        {/* Tutor Routes */}
        <Route path="/tutor/dashboard" element={
          <ProtectedRoute role="TUTOR">
            <TutorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/tutor/profile" element={
          <ProtectedRoute role="TUTOR">
            <TutorProfile />
          </ProtectedRoute>
        } />
        
        {/* Student Routes */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute role="STUDENT">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student/profile" element={
          <ProtectedRoute role="STUDENT">
            <StudentProfile />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute role="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

const resolveDefaultRoute = (user: User) => {
  if (user.role === 'ADMIN') return '/admin/dashboard'
  if (user.role === 'TUTOR') return '/tutor/dashboard'
  return '/student/dashboard'
}

export default App

