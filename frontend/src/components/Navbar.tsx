import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  LogOut,
  Sparkles,
  BookOpen,
} from 'lucide-react'

const Navbar = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setProfileMenuOpen(false)
    setMobileMenuOpen(false)
  }

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || 'J'

  // Only two centered links
  const centerLinks = [
    { to: '/how-it-works-for-tutors', label: 'How it Works For Tutors' },
  ]

  // Role-specific links for dropdowns ONLY (guest has NO links here)
  const roleLinks = {
    guest: [], // Empty — no dropdown links for guests
    student: [
      { to: '/student/dashboard', label: 'Dashboard' },
      { to: '/student/browse-tutors', label: 'Browse Tutors' },
      { to: '/student/profile', label: 'Profile' },
      { to: '/student/saved-instructors', label: 'Saved Instructors' },
      { to: '/student/bookings', label: 'My Bookings' },
      { to: '/student/invoices', label: 'Invoices & Bills' },
      { to: '/student/hour-log', label: 'Tutoring Hours' },
      { to: '/student/wallet', label: 'Wallet & Refunds' },
    ],
    tutor: [
      { to: '/tutor/dashboard', label: 'Dashboard' },
      { to: '/tutor/profile', label: 'Profile' },
      { to: '/tutor/sessions', label: 'My Sessions' },
      { to: '/tutor/earnings', label: 'Earnings & Payouts' },
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Analytics' },
      { to: '/admin/dashboard#settings', label: 'Settings' },
    ],
  }

  const currentRoleLinks = !user
    ? roleLinks.guest
    : user.role === 'ADMIN'
      ? roleLinks.admin
      : user.role === 'TUTOR'
        ? roleLinks.tutor
        : roleLinks.student

  return (
    <nav className="bg-white/95 backdrop-blur-xl sticky top-0 z-50 border-b border-violet-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <img
              src="/logo-trans.png"
              alt="JTutors Logo"
              className="h-10 w-auto object-contain"
              style={{ height: '11rem' }}
            />
          </Link>


          {/* === CENTERED: Only 2 Links === */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center gap-3 backdrop-blur-sm rounded-full px-6 py-2 shadow-inner" style={{ backgroundColor: 'rgba(230, 240, 247, 0.7)' }}>
              {centerLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300 ${isActive
                      ? 'text-white shadow-md'
                      : 'text-slate-700 hover:bg-white/70'
                    }`
                  }
                  style={({ isActive }) => isActive ? { backgroundColor: '#012c54' } : {}}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* === RIGHT: Auth & Mobile Toggle === */}
          <div className="flex items-center gap-3">
            {/* Desktop Auth */}
            {user ? (
              <div className="hidden lg:flex items-center gap-3">
                {/* User Avatar Dropdown */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="h-11 w-11 rounded-full text-white flex items-center justify-center font-bold text-lg shadow-lg hover:shadow-xl border-2 border-white"
                    style={{ background: 'linear-gradient(to bottom right, #012c54, #014a7a)' }}
                  >
                    {userInitial}
                  </motion.button>

                  <AnimatePresence>
                    {profileMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setProfileMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden"
                          style={{ borderColor: '#b3d1e8' }}
                        >
                          <div className="p-4 border-b" style={{ background: 'linear-gradient(to right, #e6f0f7, #b3d1e8)', borderColor: '#b3d1e8' }}>
                            <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                            <p className="text-xs font-semibold uppercase tracking-wide mt-1 flex items-center gap-1" style={{ color: '#012c54' }}>
                              <Sparkles className="w-3 h-3" />
                              {user.role}
                            </p>
                          </div>
                          <div className="p-2">
                            {currentRoleLinks.map((link) => (
                              <button
                                key={link.to}
                                onClick={() => {
                                  navigate(link.to)
                                  setProfileMenuOpen(false)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3"
                              >
                                <BookOpen className="w-4 h-4" />
                                {link.label}
                              </button>
                            ))}
                            <button
                              onClick={handleLogout}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                            >
                              <LogOut className="w-4 h-4" />
                              Logout
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  style={{ backgroundColor: '#f5a11a' }}
                >
                  Join JTutors
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-700"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* === MOBILE MENU === */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t shadow-2xl"
            style={{ borderColor: '#b3d1e8' }}
          >
            <div className="px-4 py-6 space-y-3">
              {/* Centered Links */}
              {centerLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block text-center py-3 px-6 text-sm font-bold rounded-full transition-all ${isActive
                      ? 'text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                  style={({ isActive }) => isActive ? { backgroundColor: '#012c54' } : {}}
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="h-px my-3" style={{ backgroundColor: '#b3d1e8' }} />

              {/* Role-Specific Links (Only if logged in) */}
              {user && currentRoleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  {link.label}
                </NavLink>
              ))}

              {/* Guest: Primary CTAs (Become Tutor only - Student registration temporarily disabled) */}
              {!user && (
                <>
                  {/* Student registration temporarily disabled for 2 weeks */}
                  {/* <Link
                    to="/register?role=student"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold rounded-xl transition-all"
                    style={{ color: '#012c54', backgroundColor: '#e6f0f7' }}
                  >
                    <User className="w-5 h-5" />
                    Find a Tutor
                  </Link> */}
                  <Link
                    to="/register?role=tutor"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 text-white font-bold text-sm rounded-xl shadow-lg"
                    style={{ backgroundColor: '#f5a11a' }}
                  >
                    <Sparkles className="w-5 h-5" />
                    Become a Tutor
                  </Link>
                </>
              )}

              {/* Logged-in User Info & Logout */}
              {user && (
                <>
                  <div className="px-4 py-3 rounded-xl" style={{ background: 'linear-gradient(to right, #e6f0f7, #b3d1e8)' }}>
                    <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: '#012c54' }}>
                      {user.role}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === MOBILE PROFILE DROPDOWN (Only if logged in) === */}
      {user && profileMenuOpen && (
        <AnimatePresence>
          <>
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setProfileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden absolute right-4 top-24 w-64 bg-white rounded-2xl shadow-2xl border border-violet-100 z-50"
            >
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide mt-1">
                  {user.role}
                </p>
              </div>
              <div className="p-2">
                {currentRoleLinks.map((link) => (
                  <button
                    key={link.to}
                    onClick={() => {
                      navigate(link.to)
                      setProfileMenuOpen(false)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 rounded-xl flex items-center gap-3"
                  >
                    <BookOpen className="w-4 h-4" />
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        </AnimatePresence>
      )}
    </nav>
  )
}

export default Navbar