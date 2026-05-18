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
    tutorApproved: boolean
    adminApproved: boolean
    paymentReleased: boolean
    studentConfirmed: boolean
    autoReleaseAt?: string | null
    pencilSpaceId?: string | null
    pencilSpaceUrl?: string | null
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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [timeFilter, setTimeFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState('')
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [creatingSpaceId, setCreatingSpaceId] = useState<string | null>(null)

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

  useEffect(() => { fetchSessions() }, [])

  const handleConfirmBooking = async (bookingId: string) => {
    setConfirmingId(bookingId); setActionMsg(''); setError('')
    try {
      await api.patch(`/tutor/bookings/${bookingId}/confirm`)
      setActionMsg('Booking confirmed! The student has been notified.')
      await fetchSessions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to confirm booking.')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleDeclineBooking = async (bookingId: string) => {
    if (!window.confirm('Decline this booking request?')) return
    setDecliningId(bookingId); setActionMsg(''); setError('')
    try {
      await api.patch(`/tutor/bookings/${bookingId}/decline`)
      setActionMsg('Booking declined. The student has been notified.')
      await fetchSessions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to decline booking.')
    } finally {
      setDecliningId(null)
    }
  }

  const handleMarkComplete = async (classSessionId: string) => {
    setCompleting(classSessionId); setActionMsg(''); setError('')
    try {
      await api.post(`/class-sessions/${classSessionId}/complete`, {})
      setActionMsg('Session marked complete. Payment will be released to you in 48 hours unless the student files a dispute.')
      await fetchSessions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark session as complete.')
    } finally {
      setCompleting(null)
    }
  }

  const handleJoinSpace = (pencilSpaceUrl: string) => {
    window.open(pencilSpaceUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCreateSpace = async (classSessionId: string) => {
    setCreatingSpaceId(classSessionId); setActionMsg(''); setError('')
    try {
      await api.post(`/class-sessions/${classSessionId}/create-space`, {})
      setActionMsg('Session link created! You can now join.')
      await fetchSessions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create session link.')
    } finally {
      setCreatingSpaceId(null)
    }
  }

  const handleCancelSession = async (bookingId: string) => {
    if (!window.confirm('Cancel this session? If the student has paid, a refund will be issued automatically.')) return
    setCancellingId(bookingId); setActionMsg(''); setError('')
    try {
      await api.patch(`/tutor/bookings/${bookingId}/cancel`)
      setActionMsg('Session cancelled successfully.')
      await fetchSessions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel session.')
    } finally {
      setCancellingId(null)
    }
  }

  const byNewest = (a: TutorSession, b: TutorSession) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()

  const hasFilters = Boolean(
    searchTerm ||
    statusFilter !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    timeFilter !== 'ALL' ||
    dateFrom ||
    dateTo ||
    showHidden
  )

  const filteredSessions = useMemo(() => {
    const now = Date.now()
    const searchLower = searchTerm.trim().toLowerCase()

    return sessions
      .filter((session) => {
        if (!showHidden && dismissedIds.has(session.id)) {
          return false
        }

        const startMs = new Date(session.startTime).getTime()
        const studentName = (session.studentName || '').toLowerCase()
        const studentEmail = (session.studentEmail || '').toLowerCase()
        const paymentStatus = (session.paymentStatus || 'PENDING').toUpperCase()

        if (
          searchLower &&
          !studentName.includes(searchLower) &&
          !studentEmail.includes(searchLower) &&
          !session.id.toLowerCase().includes(searchLower)
        ) {
          return false
        }

        if (statusFilter !== 'ALL' && session.status !== statusFilter) {
          return false
        }

        if (paymentFilter !== 'ALL' && paymentStatus !== paymentFilter) {
          return false
        }

        if (timeFilter === 'UPCOMING' && startMs < now) {
          return false
        }

        if (timeFilter === 'PAST' && startMs >= now) {
          return false
        }

        if (dateFrom) {
          const fromMs = new Date(`${dateFrom}T00:00:00`).getTime()
          if (startMs < fromMs) {
            return false
          }
        }

        if (dateTo) {
          const toMs = new Date(`${dateTo}T23:59:59`).getTime()
          if (startMs > toMs) {
            return false
          }
        }

        return true
      })
      .sort(byNewest)
  }, [dateFrom, dateTo, dismissedIds, paymentFilter, searchTerm, sessions, showHidden, statusFilter, timeFilter])

  const pendingRequests = useMemo(
    () => filteredSessions.filter((s) => s.status === 'PENDING'),
    [filteredSessions]
  )

  const activeSessions = useMemo(
    () => filteredSessions.filter((s) => s.status === 'CONFIRMED' || s.status === 'COMPLETED'),
    [filteredSessions]
  )

  const cancelledSessions = useMemo(
    () => filteredSessions.filter((s) => s.status === 'CANCELLED'),
    [filteredSessions]
  )

  const upcomingCount = useMemo(
    () => sessions.filter((s) => ['PENDING', 'CONFIRMED'].includes(s.status)).length,
    [sessions]
  )

  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === 'COMPLETED'),
    [sessions]
  )

  const handleDismiss = (id: string) =>
    setDismissedIds((prev) => new Set([...prev, id]))

  const SessionCard = ({ session }: { session: TutorSession }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{session.studentName || 'Student'}</p>
          <p className="text-xs text-slate-500">{session.studentEmail}</p>
          <p className="text-sm text-slate-600 mt-2">
            {new Date(session.startTime).toLocaleString()} • {session.durationHours.toFixed(1)} hrs
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColors[session.status] || 'bg-slate-200 text-slate-700'}`}>
              {session.status}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              session.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700'
              : session.paymentStatus === 'REFUNDED' ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
            }`}>
              {session.paymentStatus} · {session.currency} {session.paymentAmount.toFixed(2)}
            </span>
            {session.classSession?.paymentReleased && (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
                Payment released ✓
              </span>
            )}
            {session.classSession?.tutorApproved && !session.classSession.studentConfirmed && !session.classSession.paymentReleased && (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                ⏳ Payment releasing{session.classSession.autoReleaseAt
                  ? ` on ${new Date(session.classSession.autoReleaseAt).toLocaleDateString()}`
                  : ' in 48h'}
              </span>
            )}
          </div>
        </div>
        {/* Join links — only shown for confirmed/active sessions */}
        {session.status !== 'PENDING' && (
          <div className="flex flex-col gap-2">
            {session.classSession?.pencilSpaceUrl ? (
              <button
                type="button"
                onClick={() => handleJoinSpace(session.classSession!.pencilSpaceUrl!)}
                className="inline-flex items-center gap-1.5 bg-[#5046e5] hover:bg-[#4338ca] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                🖊 Join Space
              </button>
            ) : session.classSession ? (
              <button
                type="button"
                disabled={creatingSpaceId === session.classSession.id}
                onClick={() => handleCreateSpace(session.classSession!.id)}
                className="inline-flex items-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {creatingSpaceId === session.classSession.id ? '⏳ Creating…' : '🔗 Create Session Link'}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Pending: Confirm / Decline */}
      {session.status === 'PENDING' && (
        <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-3 items-center">
          <button
            type="button"
            disabled={confirmingId === session.id}
            onClick={() => handleConfirmBooking(session.id)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {confirmingId === session.id ? 'Confirming…' : '✓ Confirm Booking'}
          </button>
          <button
            type="button"
            disabled={decliningId === session.id}
            onClick={() => handleDeclineBooking(session.id)}
            className="inline-flex items-center gap-2 border border-rose-300 text-rose-600 hover:bg-rose-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {decliningId === session.id ? 'Declining…' : '✕ Decline'}
          </button>
          <p className="text-xs text-slate-500">Confirm to let the student proceed with payment.</p>
        </div>
      )}

      {/* Confirmed: Mark complete */}
      {session.classSession &&
        session.classSession.status !== 'COMPLETED' &&
        !session.classSession.tutorApproved &&
        session.status === 'CONFIRMED' && (() => {
          const sessionEndTime = new Date(session.endTime)
          const now = new Date()
          const sessionEnded = now >= sessionEndTime
          return (
            <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-3 items-start">
              <div>
                <button
                  type="button"
                  disabled={completing === session.classSession.id || !sessionEnded}
                  onClick={() => handleMarkComplete(session.classSession!.id)}
                  className="inline-flex items-center gap-2 bg-[#012c54] hover:bg-[#023a70] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {completing === session.classSession.id ? 'Processing…' : 'Mark Session as Complete'}
                </button>
                <p className="text-xs text-slate-500 mt-1">
                  {!sessionEnded 
                    ? `Session must end before marking complete (ends ${sessionEndTime.toLocaleString()})` 
                    : 'Marks the session as done and releases payment to you.'}
                </p>
              </div>
              <button
                type="button"
                disabled={cancellingId === session.id}
                onClick={() => handleCancelSession(session.id)}
                className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {cancellingId === session.id ? 'Cancelling…' : '✕ Cancel Session'}
              </button>
            </div>
          )
        })()}

      {session.classSession?.paymentReleased && (
        <p className="text-xs text-emerald-600 pt-1">✓ Payment released to your account.</p>
      )}
      {session.classSession?.tutorApproved && !session.classSession.studentConfirmed && !session.classSession.paymentReleased && (
        <p className="text-xs text-amber-600 pt-1">
          ⏳ Payment releases{session.classSession.autoReleaseAt ? ` on ${new Date(session.classSession.autoReleaseAt).toLocaleString()}` : ' within 48h'} unless student files a dispute.
        </p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Sessions</h1>
              <p className="text-slate-600 mt-2">
                Manage booking requests, deliver sessions, and track your earnings.
              </p>
            </div>
            <a
              href="https://www.pencilspaces.com/post/getting-started-with-pencil-spaces-your-step-by-step-guide"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#012c54] hover:bg-slate-50"
            >
              Pencil Spaces Guide
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pending Requests</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{pendingRequests.length}</p>
            <p className="text-sm text-slate-500 mt-1">Awaiting your confirmation</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{upcomingCount}</p>
            <p className="text-sm text-slate-500 mt-1">Confirmed sessions</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{completedSessions.length}</p>
            <p className="text-sm text-slate-500 mt-1">Sessions delivered</p>
          </div>
        </section>

        {actionMsg && (
          <div className="mb-6 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg text-sm">{actionMsg}</div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <section className="mb-8 rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="label">Search sessions</label>
              <input
                type="text"
                className="input"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by student name, email, or session ID"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:flex-1">
              <div>
                <label className="label">Status</label>
                <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="label">Payment</label>
                <select className="input" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
              <div>
                <label className="label">When</label>
                <select className="input" value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}>
                  <option value="ALL">All</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="PAST">Past</option>
                </select>
              </div>
              <div>
                <label className="label">From</label>
                <input type="date" className="input" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" className="input" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
              Show hidden cancelled sessions
            </label>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500">Showing {filteredSessions.length} of {sessions.length}</span>
              {hasFilters && (
                <button
                  type="button"
                  className="font-semibold text-[#012c54] hover:underline"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('ALL')
                    setPaymentFilter('ALL')
                    setTimeFilter('ALL')
                    setDateFrom('')
                    setDateTo('')
                    setShowHidden(false)
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">No sessions yet. New bookings will appear here.</div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">No sessions match the current filters.</div>
        ) : (
          <div className="space-y-8">
            {/* Booking Requests — need tutor action */}
            {pendingRequests.length > 0 && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Booking Requests</h2>
                  <p className="text-sm text-slate-500">Review and confirm or decline these requests.</p>
                </div>
                <div className="space-y-4">
                  {pendingRequests.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </section>
            )}

            {/* Confirmed + Completed sessions */}
            {activeSessions.length > 0 && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Your Sessions</h2>
                  <p className="text-sm text-slate-500">Confirmed and completed sessions — newest first.</p>
                </div>
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </section>
            )}

            {/* Cancelled sessions */}
            {cancelledSessions.length > 0 && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Cancelled Sessions</h2>
                    <p className="text-sm text-slate-500">Sessions that were cancelled.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedIds(new Set(cancelledSessions.map((s) => s.id)))}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Hide all
                  </button>
                </div>
                <div className="space-y-3">
                  {cancelledSessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{session.studentName || 'Student'}</p>
                        <p className="text-xs text-slate-500">{session.studentEmail}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(session.startTime).toLocaleString()} · {session.durationHours.toFixed(1)} hrs
                        </p>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 mt-2">
                          CANCELLED
                        </span>
                        {session.paymentStatus === 'REFUNDED' && (
                          <span className="ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600">
                            Refunded
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDismiss(session.id)}
                        className="text-slate-400 hover:text-slate-600 text-xs shrink-0"
                        title="Hide"
                      >
                        ✕ Hide
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default TutorSessions



