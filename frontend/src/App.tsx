import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import TutorDashboard from './pages/tutor/TutorDashboard'
import TutorProfile from './pages/tutor/TutorProfile'
import TutorSessions from './pages/tutor/TutorSessions'
import TutorEarnings from './pages/tutor/TutorEarnings'
// import StudentDashboard from './pages/student/StudentDashboard'
// import StudentProfile from './pages/student/StudentProfile'
// import SavedInstructors from './pages/student/SavedInstructors'
// import StudentBookings from './pages/student/Bookings'
// import StudentInvoices from './pages/student/Invoices'
// import StudentHourLog from './pages/student/HourLog'
// import StudentWallet from './pages/student/StudentWallet'
// import TutorDetailPage from './pages/student/TutorDetail'
// import BrowseTutors from './pages/student/BrowseTutors'
import HomePage from './pages/HomePage'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { User } from './store/authStore'

// import HowItWorksForStudents from './pages/how-it-works-for-student/page';
import HowItWorksForTutors from './pages/how-it-works-for-tutor/page'
import FAQ from './pages/FAQ'

function App() {
  const { user } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* <Route path="/how-it-works-for-students" element={<HowItWorksForStudents />} /> */}
        <Route path="/how-it-works-for-tutors" element={<HowItWorksForTutors />} />
        <Route path="/faq" element={<FAQ />} />
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
        <Route path="/tutor/sessions" element={
          <ProtectedRoute role="TUTOR">
            <TutorSessions />
          </ProtectedRoute>
        } />
        <Route path="/tutor/earnings" element={
          <ProtectedRoute role="TUTOR">
            <TutorEarnings />
          </ProtectedRoute>
        } />

        {/* Student Routes */}
        {/* <Route path="/student/dashboard" element={
          <ProtectedRoute role="STUDENT">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student/browse-tutors" element={
          <ProtectedRoute role="STUDENT">
            <BrowseTutors />
          </ProtectedRoute>
        } />
        <Route path="/student/profile" element={
          <ProtectedRoute role="STUDENT">
            <StudentProfile />
          </ProtectedRoute>
        } />
        <Route path="/student/saved-instructors" element={
          <ProtectedRoute role="STUDENT">
            <SavedInstructors />
          </ProtectedRoute>
        } />
        <Route path="/student/bookings" element={
          <ProtectedRoute role="STUDENT">
            <StudentBookings />
          </ProtectedRoute>
        } />
        <Route path="/student/invoices" element={
          <ProtectedRoute role="STUDENT">
            <StudentInvoices />
          </ProtectedRoute>
        } />
        <Route path="/student/hour-log" element={
          <ProtectedRoute role="STUDENT">
            <StudentHourLog />
          </ProtectedRoute>
        } />
        <Route path="/student/wallet" element={
          <ProtectedRoute role="STUDENT">
            <StudentWallet />
          </ProtectedRoute>
        } />
        <Route path="/student/tutor/:tutorId" element={
          <ProtectedRoute role="STUDENT">
            <TutorDetailPage />
          </ProtectedRoute>
        } /> */}

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
  return '/'
}

export default App

