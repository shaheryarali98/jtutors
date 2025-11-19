import { useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'

interface TutorSession {
  id: string
  status: string
  startTime: string
  endTime: string
  studentName: string
  studentEmail: string
  durationHours: number
  paymentStatus: string
  paymentAmount: number
  currency: string
  classSession: {
    id: string
    status: string
    googleClassroomLink?: string | null
    googleMeetLink?: string | null
  } | null
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const TutorSessions = () => {
  const [sessions, setSessions] = useState<TutorSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await api.get<{ sessions: TutorSession[] }>('/tutor/sessions')
        setSessions(response.data.sessions)
      } catch (err) {
        console.error('Error loading tutor sessions:', err)
        setError('Unable to load sessions right now. Please try again shortly.')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [])

  const upcomingSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const start = new Date(session.startTime).getTime()
        return start > Date.now() && ['PENDING', 'CONFIRMED'].includes(session.status)
      }),
    [sessions]
  )

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.status === 'COMPLETED'),
    [sessions]
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Sessions</h1>
          <p className="text-slate-600 mt-2">
            Track upcoming lessons, completed sessions, and session logistics all in one place.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{upcomingSessions.length}</p>
            <p className="text-sm text-slate-500 mt-1">Sessions scheduled</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{completedSessions.length}</p>
            <p className="text-sm text-slate-500 mt-1">Sessions delivered</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total sessions</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{sessions.length}</p>
            <p className="text-sm text-slate-500 mt-1">Across all students</p>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Session timeline</h2>
              <p className="text-sm text-slate-500">Most recent sessions appear first.</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-slate-500 py-10">Loading sessions…</div>
          ) : error ? (
            <div className="text-center text-red-600 py-10">{error}</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-slate-500 py-10">No sessions yet. New bookings will appear here.</div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{session.studentName || 'Student'}</p>
                    <p className="text-xs text-slate-500">{session.studentEmail}</p>
                    <p className="text-sm text-slate-600 mt-2">
                      {new Date(session.startTime).toLocaleString()} • {session.durationHours.toFixed(1)} hrs
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          statusColors[session.status] || 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {session.status}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          session.paymentStatus === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : session.paymentStatus === 'REFUNDED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {session.paymentStatus} · {session.currency} {session.paymentAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-slate-600">
                    {session.classSession?.googleClassroomLink && (
                      <a
                        href={session.classSession.googleClassroomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 font-medium hover:text-primary-700"
                      >
                        Classroom link →
                      </a>
                    )}
                    {session.classSession?.googleMeetLink && (
                      <a
                        href={session.classSession.googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        Meet link →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default TutorSessions


