import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const Navbar = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const guestLinks = [
    { to: '/register?role=student', label: 'Find a Tutor' },
    { to: '/register?role=tutor', label: 'Become a Tutor' }
  ]

  const tutorLinks = [
    { to: '/tutor/dashboard', label: 'Dashboard' },
    { to: '/tutor/profile', label: 'Profile' }
  ]

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard' },
    { to: '/student/profile', label: 'Profile' }
  ]

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Analytics' },
    { to: '/admin/dashboard#settings', label: 'Settings' }
  ]

  const links = !user
    ? guestLinks
    : user.role === 'ADMIN'
      ? adminLinks
      : user.role === 'TUTOR'
        ? tutorLinks
        : studentLinks

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || 'J'

  return (
    <nav className="bg-white/90 backdrop-blur sticky top-0 z-30 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
        <Link to="/" className="flex items-center">
  <img
    src="/logo.jpg"
    alt="JTutor Logo"
    className="h-10 w-auto object-contain"
    style={{ height: '5rem' }}
  />
</Link>


          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-primary-600' : 'text-slate-600 hover:text-primary-600'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="md:hidden">
            {links.length > 0 && (
              <NavLink
                to={links[0].to}
                className="text-sm font-medium text-primary-600"
              >
                {links[0].label}
              </NavLink>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-800">{user.email}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-500">{user.role}</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                  {userInitial}
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-primary hidden sm:inline-flex"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-primary-600">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Join JTutor
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

