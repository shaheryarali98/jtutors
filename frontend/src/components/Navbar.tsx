import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  GraduationCap,
  LogOut,
  User,
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
    { to: '/how-it-works-for-students', label: 'How it Works For Students' },
    { to: '/how-it-works-for-tutors', label: 'How it Works For Tutors' },
  ]

  // Role-specific links for dropdowns ONLY (guest has NO links here)
  const roleLinks = {
    guest: [], // Empty — no dropdown links for guests
    student: [
      { to: '/student/dashboard', label: 'Dashboard' },
      { to: '/student/profile', label: 'Profile' },
    ],
    tutor: [
      { to: '/tutor/dashboard', label: 'Dashboard' },
      { to: '/tutor/profile', label: 'Profile' },
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
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-purple-600 text-white font-bold shadow-xl shadow-violet-500/30 group-hover:shadow-2xl group-hover:shadow-violet-500/50 transition-all"
            >
              <GraduationCap className="w-7 h-7" />
            </motion.div>
            <div>
              <span className="block text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600 tracking-tight">
                JTutor
              </span>
              <span className="block text-xs text-slate-500 -mt-1 font-medium">
                Personalised learning
              </span>
            </div>
          </Link>

          {/* === CENTERED: Only 2 Links === */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center gap-3 bg-violet-50/70 backdrop-blur-sm rounded-full px-6 py-2 shadow-inner">
              {centerLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                        : 'text-slate-700 hover:text-violet-600 hover:bg-white/70'
                    }`
                  }
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
                    className="h-11 w-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg hover:shadow-xl border-2 border-white"
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
                          className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-violet-100 z-50 overflow-hidden"
                        >
                          <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                            <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                            <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide mt-1 flex items-center gap-1">
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
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 rounded-xl transition-colors flex items-center gap-3"
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
                  className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  Join JTutor
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl hover:bg-violet-50 transition-colors text-slate-700"
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
            className="lg:hidden bg-white border-t border-violet-100 shadow-2xl"
          >
            <div className="px-4 py-6 space-y-3">
              {/* Centered Links */}
              {centerLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block text-center py-3 px-6 text-sm font-bold rounded-full transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                        : 'text-slate-700 hover:bg-violet-50'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="h-px bg-violet-100 my-3" />

              {/* Role-Specific Links (Only if logged in) */}
              {user && currentRoleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-violet-50 rounded-xl transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  {link.label}
                </NavLink>
              ))}

              {/* Guest: Primary CTAs (Find Tutor / Become Tutor) */}
              {!user && (
                <>
                  <Link
                    to="/register?role=student"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-violet-700 bg-violet-50 rounded-xl hover:bg-violet-100 transition-all"
                  >
                    <User className="w-5 h-5" />
                    Find a Tutor
                  </Link>
                  <Link
                    to="/register?role=tutor"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm rounded-xl shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    Become a Tutor
                  </Link>
                </>
              )}

              {/* Logged-in User Info & Logout */}
              {user && (
                <>
                  <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                    <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide mt-1">
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