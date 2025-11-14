import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import PaymentModal from '../../components/student/PaymentModal'

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
    status: string
    tutorApproved: boolean
    adminApproved: boolean
  } | null
  payment?: {
    id: string
    amount: number
    currency: string
    paymentStatus: string
    paidAt?: string | null
  } | null
}

const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const StudentBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<{
    clientSecret: string
    paymentId: string
    amount: number
    currency: string
  } | null>(null)

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/bookings')
      setBookings(response.data.bookings)
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError('Unable to load your bookings right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handlePayNow = async (booking: Booking) => {
    try {
      const amount =
        booking.payment?.amount ??
        Math.max(1, Math.round((booking.durationHours || 1) * booking.tutor.hourlyFee * 100) / 100)

      const response = await api.post('/payments', {
        bookingId: booking.id,
        amount,
        currency: booking.payment?.currency || 'USD',
      })

      const payment = response.data.payment
      if (!payment?.clientSecret) {
        setError('Stripe is not configured. Please contact support.')
        return
      }

      setSelectedPayment({
        clientSecret: payment.clientSecret,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
      })
    } catch (err) {
      console.error('Error creating payment:', err)
      setError('Unable to start payment. Please try again later.')
    }
  }

  const closePaymentModal = () => {
    setSelectedPayment(null)
  }

  const handlePaymentSuccess = () => {
    setSelectedPayment(null)
    fetchBookings()
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

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ),
    [bookings]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Hires & Sessions</h1>
          <p className="text-slate-600 mt-2">
            Review upcoming and completed sessions, track approvals, and settle invoices using secure Stripe payments.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">
            Loading your bookings…
          </div>
        ) : sortedBookings.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-12 text-center">
            <div className="text-6xl mb-3">📅</div>
            <h3 className="text-xl font-semibold text-slate-900">No hires yet</h3>
            <p className="text-slate-500 mt-2">
              Once you hire a tutor, your sessions will appear here for easy tracking.
            </p>
            <Link to="/student/dashboard" className="btn btn-primary mt-6 inline-flex items-center justify-center">
              Find a tutor
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedBookings.map((booking) => {
              const tutor = booking.tutor
              const start = new Date(booking.startTime)
              const end = new Date(booking.endTime)
              const needsPayment = !booking.payment || booking.payment.paymentStatus !== 'PAID'
              const amountDue =
                booking.payment?.amount ??
                Math.max(1, Math.round((booking.durationHours || 1) * tutor.hourlyFee * 100) / 100)
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
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-slate-900">
                            {tutor.firstName} {tutor.lastName}
                          </h2>
                          {renderStatusBadge(booking.status)}
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
                          {(booking.payment?.currency || 'USD').toUpperCase()} {amountDue.toFixed(2)}
                        </span>
                      </p>
                      {booking.payment?.paidAt && (
                        <p className="text-xs text-slate-400 mt-1">
                          Paid on {formatter.format(new Date(booking.payment.paidAt))}
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
                        Tutor approval: {booking.classSession?.tutorApproved ? '✅' : '⌛'} | Admin approval:{' '}
                        {booking.classSession?.adminApproved ? '✅' : '⌛'}
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

                  <div className="mt-6 flex flex-col md:flex-row gap-3">
                    {needsPayment && (
                      <button
                        type="button"
                        className="btn btn-primary inline-flex items-center justify-center gap-2 md:w-auto"
                        onClick={() => handlePayNow(booking)}
                      >
                        Pay with Stripe
                      </button>
                    )}
                    <Link
                      to="/student/invoices"
                      className="btn btn-outline inline-flex items-center justify-center md:w-auto"
                    >
                      View invoices
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <PaymentModal
        clientSecret={selectedPayment?.clientSecret || null}
        paymentId={selectedPayment?.paymentId || null}
        amount={selectedPayment?.amount || 0}
        currency={selectedPayment?.currency || 'USD'}
        onSuccess={handlePaymentSuccess}
        onCancel={closePaymentModal}
      />
    </div>
  )
}

export default StudentBookings


