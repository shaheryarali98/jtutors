import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

interface DashStats {
  pendingRequests: number
  upcomingSessions: number
  completedSessions: number
  totalEarnings: number
}

const TutorDashboard = () => {
  const { user } = useAuthStore()
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashStats>({ pendingRequests: 0, upcomingSessions: 0, completedSessions: 0, totalEarnings: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const [completionRes, sessionsRes] = await Promise.all([
          api.get('/tutor/profile/completion'),
          api.get<{ sessions: any[] }>('/tutor/sessions'),
        ])
        setProfileCompletion(completionRes.data.profileCompletion)
        const sessions: any[] = sessionsRes.data.sessions ?? []
        setStats({
          pendingRequests: sessions.filter(s => s.status === 'PENDING').length,
          upcomingSessions: sessions.filter(s => s.status === 'CONFIRMED').length,
          completedSessions: sessions.filter(s => s.status === 'COMPLETED').length,
          totalEarnings: sessions
            .filter(s => s.classSession?.paymentReleased)
            .reduce((sum, s) => sum + (s.paymentAmount || 0), 0),
        })
      } catch (error) {
        console.error('Dashboard load error:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const steps = [
    { threshold: 14, label: 'Complete personal information' },
    { threshold: 29, label: 'Add your teaching experience' },
    { threshold: 43, label: 'Add your education background' },
    { threshold: 57, label: 'Select subjects you can teach' },
    { threshold: 71, label: 'Set your availability' },
    { threshold: 86, label: 'Connect your payment method' },
    { threshold: 100, label: 'Complete background check' },
  ]

  const quickLinks = [
    { to: '/tutor/sessions', icon: '📚', label: 'My Sessions', desc: 'View booking requests and manage sessions', badge: stats.pendingRequests > 0 ? stats.pendingRequests : null },
    { to: '/tutor/profile', icon: '👤', label: 'My Profile', desc: 'Update your info, availability, and qualifications' },
    { to: '/tutor/earnings', icon: '💰', label: 'Earnings & Payouts', desc: 'Track your payment history and payouts' },
    { to: '/tutor/courses', icon: '🎓', label: 'My Courses', desc: 'Manage your courses and enrolled students' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your tutoring today.</p>
        </div>

        {/* Profile completion banner */}
        {!loading && profileCompletion < 100 && (
          <div className="bg-gradient-to-r from-[#012c54] to-[#014a7a] rounded-2xl p-6 mb-8 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold">Complete Your Profile ({profileCompletion}%)</h2>
                <p className="text-white/80 text-sm mt-1">Finish setting up to start receiving students and get paid.</p>
                <div className="mt-3 w-full bg-white/20 rounded-full h-2.5">
                  <div
                    className="bg-[#f5a11a] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
              <Link to="/tutor/profile" className="inline-flex items-center gap-2 bg-[#f5a11a] hover:bg-[#d9901a] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0">
                Complete Profile →
              </Link>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending Requests', value: stats.pendingRequests, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⏳' },
            { label: 'Upcoming Sessions', value: stats.upcomingSessions, color: 'text-blue-600', bg: 'bg-blue-50', icon: '📅' },
            { label: 'Sessions Completed', value: stats.completedSessions, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
            { label: 'Total Earned', value: `$${stats.totalEarnings.toFixed(0)}`, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: '💵' },
          ].map(({ label, value, color, bg, icon }) => (
            <div key={label} className={`${bg} rounded-2xl border border-white shadow-sm p-5`}>
              <div className="text-2xl mb-2">{icon}</div>
              <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickLinks.map(({ to, icon, label, desc, badge }) => (
            <Link
              key={to}
              to={to}
              className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-[#012c54]/30 transition-all duration-200"
            >
              {badge != null && (
                <span className="absolute top-4 right-4 bg-rose-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {badge}
                </span>
              )}
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-[#012c54]">{label}</h3>
              <p className="text-sm text-slate-500 mt-1 leading-snug">{desc}</p>
              <span className="inline-block mt-3 text-xs font-semibold text-[#012c54] group-hover:underline">Open →</span>
            </Link>
          ))}
        </div>

        {/* Getting started checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Setup Checklist</h2>
          <div className="space-y-3">
            {steps.map(({ threshold, label }) => {
              const done = profileCompletion >= threshold
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {done ? '✓' : ''}
                  </div>
                  <span className={`text-sm ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default TutorDashboard
