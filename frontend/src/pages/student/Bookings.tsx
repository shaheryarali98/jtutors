import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import { usePlatformSettings } from '../../store/settingsStore'

const LOCAL_BOOKING_COUPON_KEY = 'jtutors-booking-coupon'

interface Booking {
  id: string
  startTime: string
  endTime: string
  status: string
  durationHours: number
  tutor: {
    id: string
    firstName: string
    lastName: string
    hourlyFee: number
    profileImage?: string
    city?: string
    state?: string
    country?: string
  }
  classSession?: {
    id: string
    status: string
    tutorApproved: boolean
    adminApproved: boolean
    pencilSpaceId?: string | null
    pencilSpaceUrl?: string | null
    paymentReleased?: boolean
    studentConfirmed?: boolean
    autoReleaseAt?: string | null
  } | null
  payment?: {
    id: string
    amount: number
    currency: string
    paymentStatus: string
    paidAt?: string | null
  } | null
  extraTimeCharge?: {
    id: string
    status: string
    extraHours: number
    studentChargeAmount: number
    requestedAt: string
  } | null
}

type LocalBookingCoupon = {
  bookingId?: string | null
  tutorId?: string | null
  startTime?: string | null
  endTime?: string | null
  couponCode?: string | null
  discountPercent?: number
}

const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const readLocalBookingCoupon = (): LocalBookingCoupon | null => {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKING_COUPON_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LocalBookingCoupon
  } catch {
    return null
  }
}

const getBookingCoupon = (booking: Booking): LocalBookingCoupon | null => {
  const stored = readLocalBookingCoupon()
  if (!stored?.couponCode || !stored.discountPercent) return null

  if (stored.bookingId && stored.bookingId === booking.id) {
    return stored
  }

  const sameTutor = stored.tutorId && stored.tutorId === booking.tutor.id
  const sameStart = stored.startTime && new Date(stored.startTime).toISOString() === new Date(booking.startTime).toISOString()
  const sameEnd = stored.endTime && new Date(stored.endTime).toISOString() === new Date(booking.endTime).toISOString()

  return sameTutor && sameStart && sameEnd ? stored : null
}

const StudentBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [timeFilter, setTimeFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payErrors, setPayErrors] = useState<Record<string, string>>({})
  const [extraAmountInputs, setExtraAmountInputs] = useState<Record<string, string>>({})
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [searchParams, setSearchParams] = useSearchParams()
  const { settings: platformSettings, fetchSettings } = usePlatformSettings()
  const studentFeePct = platformSettings?.studentFeePercentage ?? 4.5

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/bookings')
      setBookings(Array.isArray(response.data?.bookings) ? response.data.bookings : [])
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError('Unable to load your bookings right now.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
    fetchSettings()
    if (searchParams.get('paid') === '1') {
      setInfo('Payment successful! Your booking is confirmed.')
      searchParams.delete('paid'); searchParams.delete('session_id')
      setSearchParams(searchParams, { replace: true })
    } else if (searchParams.get('extra_paid') === '1') {
      setInfo('Extra-time payment successful!')
      searchParams.delete('extra_paid'); searchParams.delete('session_id')
      setSearchParams(searchParams, { replace: true })
    } else if (searchParams.get('cancelled') === '1') {
      setInfo('Payment was cancelled. You can try again anytime.')
      searchParams.delete('cancelled')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setExtraAmountInputs((prev) => {
      const next = { ...prev }
      for (const booking of bookings) {
        const charge = booking.extraTimeCharge
        if (!charge || charge.status !== 'PENDING') continue
        if (!next[charge.id]) {
          next[charge.id] = charge.studentChargeAmount.toFixed(2)
        }
      }
      return next
    })
  }, [bookings])

  const handlePayNow = async (booking: Booking) => {
    setError(''); setInfo('')
    setPayErrors(prev => { const next = { ...prev }; delete next[booking.id]; return next })
    setPayingId(booking.id)
    try {
      const coupon = getBookingCoupon(booking)
      const response = await api.post('/payments/checkout', {
        bookingId: booking.id,
        couponCode: coupon?.couponCode ?? undefined,
      })
      if (response.data?.url) {
        window.location.href = response.data.url
        return
      }
      setPayErrors(prev => ({ ...prev, [booking.id]: 'Unable to start checkout. Please try again.' }))
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to start payment. Please try again later.'
      setPayErrors(prev => ({ ...prev, [booking.id]: msg }))
    } finally {
      setPayingId(null)
    }
  }

  const handleDismiss = (bookingId: string) => {
    setDismissedIds(prev => new Set([...prev, bookingId]))
  }

  const handlePayExtraTime = async (booking: Booking) => {
    if (!booking.extraTimeCharge) return

    const inputValue = (extraAmountInputs[booking.extraTimeCharge.id] ?? booking.extraTimeCharge.studentChargeAmount.toFixed(2)).trim()
    const amount = Number(inputValue)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayErrors(prev => ({ ...prev, [booking.extraTimeCharge!.id]: 'Please enter a valid amount greater than 0.' }))
      return
    }

    setError('')
    setInfo('')
    setPayErrors(prev => {
      const next = { ...prev }
      delete next[booking.extraTimeCharge!.id]
      return next
    })
    setPayingId(booking.extraTimeCharge.id)

    try {
      const response = await api.post(`/payments/extra-time/${booking.extraTimeCharge.id}/checkout`, { amount })
      if (response.data?.url) {
        window.location.href = response.data.url
        return
      }
      setPayErrors(prev => ({ ...prev, [booking.extraTimeCharge!.id]: 'Unable to start extra-time checkout.' }))
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to pay extra-time request right now.'
      setPayErrors(prev => ({ ...prev, [booking.extraTimeCharge!.id]: msg }))
    } finally {
      setPayingId(null)
    }
  }

  const handleJoinSpace = (pencilSpaceUrl: string) => {
    window.open(pencilSpaceUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Cancel this booking? If already paid, a refund will be issued automatically.')) return
    setCancellingId(bookingId)
    setError(''); setInfo('')
    try {
      await api.patch(`/student/bookings/${bookingId}/cancel`)
      setInfo('Booking cancelled successfully.')
      await fetchBookings()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking.')
    } finally {
      setCancellingId(null)
    }
  }

  const renderStatusBadge = (status: string) => {
    const normalized = status.toUpperCase()
    const variants: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700',
      CONFIRMED: 'bg-emerald-100 text-emerald-700',
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-rose-100 text-rose-700',
    }
    const classes = variants[normalized] || 'bg-slate-100 text-slate-600'
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${classes}`}>
        {normalized}
      </span>
    )
  }

  const hasFilters = Boolean(
    searchTerm ||
    statusFilter !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    timeFilter !== 'ALL' ||
    dateFrom ||
    dateTo ||
    showHidden
  )

  const filteredBookings = useMemo(() => {
    const now = Date.now()
    const searchLower = searchTerm.trim().toLowerCase()

    return [...bookings]
      .filter((booking) => {
        if (!showHidden && dismissedIds.has(booking.id)) {
          return false
        }

        const startMs = new Date(booking.startTime).getTime()
        const paymentStatus = (booking.payment?.paymentStatus ?? 'PENDING').toUpperCase()
        const tutorName = `${booking.tutor.firstName} ${booking.tutor.lastName}`.toLowerCase()
        const tutorLocation = `${booking.tutor.city ?? ''} ${booking.tutor.state ?? ''} ${booking.tutor.country ?? ''}`.toLowerCase()

        if (
          searchLower &&
          !tutorName.includes(searchLower) &&
          !tutorLocation.includes(searchLower) &&
          !booking.id.toLowerCase().includes(searchLower)
        ) {
          return false
        }

        if (statusFilter !== 'ALL' && booking.status !== statusFilter) {
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
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [bookings, dateFrom, dateTo, dismissedIds, paymentFilter, searchTerm, showHidden, statusFilter, timeFilter])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow p-6 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Hires & Sessions</h1>
              <p className="text-slate-600 mt-2">
                Review upcoming and completed sessions, track approvals, and manage payment steps in one place.
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
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
        )}
        {info && (
          <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">{info}</div>
        )}

        <div className="bg-white rounded-3xl shadow p-6 mb-8 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="label">Search bookings</label>
              <input
                type="text"
                className="input"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by tutor name, location, or booking ID"
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
              Show hidden cancelled bookings
            </label>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500">Showing {filteredBookings.length} of {bookings.length}</span>
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
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">
            Loading your bookings…
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-12 text-center">
            <div className="text-6xl mb-3">📅</div>
            <h3 className="text-xl font-semibold text-slate-900">{bookings.length === 0 ? 'No hires yet' : 'No bookings match these filters'}</h3>
            <p className="text-slate-500 mt-2">
              {bookings.length === 0
                ? 'Once you hire a tutor, your sessions will appear here for easy tracking.'
                : 'Try widening your search, date range, or status filters.'}
            </p>
            <Link to="/student/dashboard" className="btn btn-primary mt-6 inline-flex items-center justify-center">
              Find a tutor
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => {
              const tutor = booking.tutor
              const start = new Date(booking.startTime)
              const end = new Date(booking.endTime)
              const needsPayment = booking.status === 'CONFIRMED' && (!booking.payment || booking.payment.paymentStatus !== 'PAID')
              const hasPendingExtraTime = booking.extraTimeCharge?.status === 'PENDING'
              const baseAmountDue =
                booking.payment?.amount ??
                Math.max(1, Math.round((booking.durationHours || 1) * tutor.hourlyFee * 100) / 100)
              const bookingCoupon = getBookingCoupon(booking)
              const couponDiscountPercent = bookingCoupon?.couponCode?.trim().toLowerCase() === 'backtoschool'
                ? 50
                : 0
              const discountedAmountDue = couponDiscountPercent > 0
                ? Math.max(0, baseAmountDue * (1 - couponDiscountPercent / 100))
                : baseAmountDue
              const studentFeeAmount = discountedAmountDue * studentFeePct / 100
              const totalDue = discountedAmountDue + studentFeeAmount
              const displayImage = resolveImageUrl(tutor.profileImage)

              return (
                <div key={booking.id} className="bg-white rounded-3xl shadow p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center text-lg font-semibold text-primary-600">
                        {displayImage ? (
                          <img src={displayImage} alt={`${tutor.firstName}`} className="h-full w-full object-cover" />
                        ) : (
                          `${tutor.firstName.charAt(0)}${tutor.lastName.charAt(0)}`
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-semibold text-slate-900">
                            {tutor.firstName} {tutor.lastName}
                          </h2>
                          {renderStatusBadge(booking.status)}
                          {booking.status === 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handleDismiss(booking.id)}
                              className="ml-1 text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full px-2 py-0.5 border border-slate-200 transition-colors"
                              title="Remove from list"
                            >
                              ✕ Hide
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {tutor.city ? `${tutor.city}, ${tutor.state || tutor.country}` : tutor.country}
                        </p>
                        <div className="mt-2 text-sm text-slate-600">
                          <p>
                            <span className="font-medium text-slate-800">Start:</span> {formatter.format(start)}
                          </p>
                          <p>
                            <span className="font-medium text-slate-800">End:</span> {formatter.format(end)}
                          </p>
                          <p>
                            <span className="font-medium text-slate-800">Duration:</span>{' '}
                            {booking.durationHours.toFixed(2)} hours
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 min-w-[220px]">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Payment status
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {booking.payment?.paymentStatus ?? 'PENDING'}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Amount due:{' '}
                        <span className="font-semibold text-slate-900">
                          {(booking.payment?.currency || 'USD').toUpperCase()} {discountedAmountDue.toFixed(2)}
                        </span>
                      </p>
                      {couponDiscountPercent > 0 && (
                        <p className="text-xs text-emerald-600 mt-1">
                          Backtoschool coupon applied ({couponDiscountPercent}% off)
                        </p>
                      )}
                      {booking.payment?.paidAt && (
                        <p className="text-xs text-slate-400 mt-1">
                          Paid on {formatter.format(new Date(booking.payment.paidAt))}
                        </p>
                      )}
                      {booking.extraTimeCharge && (
                        <p className={`text-xs mt-1 ${booking.extraTimeCharge.status === 'PAID' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                          Extra-time request: {booking.extraTimeCharge.status}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Class status
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {booking.classSession?.status ?? 'NOT SCHEDULED'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Session {booking.classSession?.status === 'COMPLETED' ? '✅ Completed' : booking.classSession?.tutorApproved ? '✅ Done' : '⌛ Scheduled'}
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Tutor rate
                      </p>
                      <p className="text-sm font-medium text-slate-800">${tutor.hourlyFee.toFixed(2)} / hour</p>
                      <p className="text-xs text-slate-500 mt-1">Calculated automatically at checkout.</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Session ID
                      </p>
                      <p className="text-xs font-mono text-slate-600 break-all">{booking.id}</p>
                    </div>
                  </div>

                  {/* Session space link */}
                  {booking.status === 'CONFIRMED' && booking.payment?.paymentStatus === 'PAID' && (
                    <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <p className="text-sm font-semibold text-indigo-900 mb-3">Your Tutoring Session</p>
                      {booking.classSession?.pencilSpaceUrl ? (
                        <button
                          type="button"
                          onClick={() => handleJoinSpace(booking.classSession!.pencilSpaceUrl!)}
                          className="btn btn-primary inline-flex items-center justify-center gap-2"
                        >
                          🖊 Start Tutoring Session
                        </button>
                      ) : (
                        <p className="text-sm text-indigo-700">
                          ⏳ Your tutor will share the session link before your scheduled time. Check back closer to your start time.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Dispute window — shown while payment is held after tutor marks complete */}
                  {booking.classSession?.tutorApproved &&
                    !booking.classSession.paymentReleased && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="font-semibold text-amber-900">Payment pending release</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Your tutor marked this session complete.
                        {booking.classSession.autoReleaseAt ? (
                          <> Payment will be automatically released on{' '}
                            <strong>{new Date(booking.classSession.autoReleaseAt).toLocaleString()}</strong>.
                          </>
                        ) : (
                          <> Payment will be automatically released within 48 hours.</>
                        )}
                      </p>
                      <p className="text-sm text-amber-700 mt-2">
                        If the session did <strong>not</strong> happen, dispute before the release date.
                      </p>
                      <div className="mt-3">
                        <a
                          href="mailto:support@jtutors.com?subject=Session%20Dispute"
                          className="btn btn-outline text-sm border-rose-300 text-rose-600 hover:bg-rose-50"
                        >
                          File a dispute
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col md:flex-row gap-3">
                    {booking.status === 'PENDING' && (!booking.payment || booking.payment.paymentStatus !== 'PAID') && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                        ⌛ Awaiting tutor confirmation — you'll be able to pay once the tutor confirms.
                      </div>
                    )}
                    {needsPayment && (
                      <>
                        <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700 space-y-1 md:self-center">
                          <div className="flex justify-between gap-6">
                            <span>Session price</span>
                            <span className="font-medium">${baseAmountDue.toFixed(2)}</span>
                          </div>
                          {couponDiscountPercent > 0 && (
                            <div className="flex justify-between gap-6 text-emerald-600">
                              <span>Coupon discount ({couponDiscountPercent}% off)</span>
                              <span>-${(baseAmountDue - discountedAmountDue).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-6 text-slate-500">
                            <span>Service fee ({studentFeePct}%)</span>
                            <span>+${studentFeeAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-6 font-semibold border-t border-slate-200 pt-1 mt-1">
                            <span>Total due</span>
                            <span>${totalDue.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 md:self-center">
                          <button
                            type="button"
                            className="btn btn-primary inline-flex items-center justify-center gap-2 md:w-auto disabled:opacity-60"
                            onClick={() => handlePayNow(booking)}
                            disabled={payingId === booking.id}
                          >
                            {payingId === booking.id ? 'Redirecting…' : `Pay $${totalDue.toFixed(2)} with Stripe`}
                          </button>
                          {payErrors[booking.id] && (
                            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 max-w-xs">
                              ⚠️ {payErrors[booking.id]}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                    {hasPendingExtraTime && booking.extraTimeCharge && (
                      <>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-sm text-indigo-900 space-y-2 md:self-center">
                          <div className="flex justify-between gap-6">
                            <span>Extra hours</span>
                            <span className="font-medium">{booking.extraTimeCharge.extraHours.toFixed(2)}h</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span>Suggested amount</span>
                            <span className="font-semibold">${booking.extraTimeCharge.studentChargeAmount.toFixed(2)}</span>
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Pay amount (USD)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="input mt-1"
                              value={extraAmountInputs[booking.extraTimeCharge.id] ?? booking.extraTimeCharge.studentChargeAmount.toFixed(2)}
                              onChange={(event) => {
                                const value = event.target.value
                                setExtraAmountInputs((prev) => ({
                                  ...prev,
                                  [booking.extraTimeCharge!.id]: value,
                                }))
                                setPayErrors((prev) => {
                                  const next = { ...prev }
                                  delete next[booking.extraTimeCharge!.id]
                                  return next
                                })
                              }}
                              placeholder="Enter any amount"
                            />
                            <p className="text-xs text-indigo-700 mt-1">You can enter any amount you want to pay.</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 md:self-center">
                          <button
                            type="button"
                            className="btn btn-primary inline-flex items-center justify-center gap-2 md:w-auto disabled:opacity-60"
                            onClick={() => handlePayExtraTime(booking)}
                            disabled={payingId === booking.extraTimeCharge.id}
                          >
                            {payingId === booking.extraTimeCharge.id ? 'Redirecting…' : 'Pay Extra Time'}
                          </button>
                          {payErrors[booking.extraTimeCharge.id] && (
                            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 max-w-xs">
                              ⚠️ {payErrors[booking.extraTimeCharge.id]}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                    {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        className="btn btn-outline border-rose-300 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center gap-2 md:w-auto disabled:opacity-60"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancellingId === booking.id}
                      >
                        {cancellingId === booking.id ? 'Cancelling…' : 'Cancel booking'}
                      </button>
                    )}
                    <Link
                      to="/student/wallet"
                      className="btn btn-outline inline-flex items-center justify-center md:w-auto"
                    >
                      Open wallet
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default StudentBookings


