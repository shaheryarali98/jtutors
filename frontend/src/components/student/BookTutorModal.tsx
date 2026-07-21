import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'

type TutorSummary = {
  id: string
  firstName: string
  lastName: string
  hourlyFee: number
  profileImage?: string
  city?: string
  state?: string
  country?: string
  tagline?: string
}

interface BookTutorModalProps {
  tutor: TutorSummary | null
  isOpen: boolean
  onClose: () => void
  onBooked: () => void
  onError?: (message: string) => void
}

interface AvailabilitySlot {
  start: string
  end: string
}

const LOCAL_BOOKING_COUPON_KEY = 'jtutors-booking-coupon'

const BookTutorModal = ({ tutor, isOpen, onClose, onBooked, onError }: BookTutorModalProps) => {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [couponFeedback, setCouponFeedback] = useState('')
  const [couponFeedbackType, setCouponFeedbackType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    if (isOpen && tutor?.id) {
      setNotes('')
      setError('')
      setSlots([])
      setSelectedSlotIdx(null)
      setLoadingSlots(true)
      setCouponCode('')
      setDiscountPercent(0)
      setCouponFeedback('')
      setCouponFeedbackType('')

      api
        .get(`/student/tutors/${tutor.id}`, { params: { _t: Date.now() } })
        .then((res) => {
          const fromApi: AvailabilitySlot[] = Array.isArray(res.data?.tutor?.bookableSlots)
            ? res.data.tutor.bookableSlots
            : []
          setSlots(fromApi)
          if (fromApi.length > 0) setSelectedSlotIdx(0)
        })
        .catch(() => {
          setError('Unable to load available slots right now. Please try again.')
        })
        .finally(() => setLoadingSlots(false))
    }
  }, [isOpen, tutor?.id])

  if (!isOpen || !tutor) {
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (selectedSlotIdx === null || !slots[selectedSlotIdx]) {
        throw new Error('Please select one of the available time slots.')
      }

      const bookingStart = new Date(slots[selectedSlotIdx].start)
      const bookingEnd = new Date(slots[selectedSlotIdx].end)

      const response = await api.post('/student/bookings', {
        tutorId: tutor.id,
        startTime: bookingStart.toISOString(),
        endTime: bookingEnd.toISOString(),
        notes: notes.trim() || undefined,
      })

      if (discountPercent > 0 && couponCode.trim()) {
        localStorage.setItem(
          LOCAL_BOOKING_COUPON_KEY,
          JSON.stringify({
            bookingId: response.data?.booking?.id ?? null,
            tutorId: tutor.id,
            startTime: bookingStart.toISOString(),
            endTime: bookingEnd.toISOString(),
            couponCode: couponCode.trim(),
            discountPercent,
          })
        )
      } else {
        localStorage.removeItem(LOCAL_BOOKING_COUPON_KEY)
      }

      onBooked()
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Unable to create hire request.'
      setError(message)
      onError?.(message)
    } finally {
      setSubmitting(false)
    }
  }

  const displayImage = resolveImageUrl(tutor.profileImage)
  const selectedSlot = selectedSlotIdx !== null ? slots[selectedSlotIdx] : null
  const sessionHours = selectedSlot
    ? Math.max(0, (new Date(selectedSlot.end).getTime() - new Date(selectedSlot.start).getTime()) / 3_600_000)
    : 0
  const baseSessionPrice = tutor.hourlyFee * sessionHours
  const discountAmount = baseSessionPrice * (discountPercent / 100)
  const finalSessionPrice = Math.max(0, baseSessionPrice - discountAmount)

  const getSlotLabel = (slot: AvailabilitySlot) => {
    const start = new Date(slot.start)
    const end = new Date(slot.end)
    return `${start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })} • ${start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })} – ${end.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  const handleApplyCoupon = () => {
    const normalizedCode = couponCode.trim().toLowerCase()

    if (!normalizedCode) {
      setDiscountPercent(0)
      setCouponFeedback('Please enter a coupon code.')
      setCouponFeedbackType('error')
      return
    }

    if (normalizedCode === 'backtoschool') {
      setDiscountPercent(50)
      setCouponFeedback('50% off applied!')
      setCouponFeedbackType('success')
      return
    }

    setDiscountPercent(0)
    setCouponFeedback('Invalid coupon code.')
    setCouponFeedbackType('error')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Hire {tutor.firstName} for a session
            </h2>
            <p className="text-sm text-slate-500">
              Set a time that works for you. We&apos;ll notify the tutor to confirm the
              booking and next steps.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close booking modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center text-lg font-semibold text-primary-600">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={tutor.firstName}
                  className="h-full w-full object-cover"
                />
              ) : (
                `${tutor.firstName?.charAt(0) ?? ''}${tutor.lastName?.charAt(0) ?? ''}`
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {tutor.firstName} {tutor.lastName}
              </h3>
              <p className="text-sm text-slate-500">
                {tutor.city ? `${tutor.city}, ${tutor.state || tutor.country}` : tutor.country}
              </p>
              <p className="text-sm text-primary-600 font-medium mt-1">
                ${tutor.hourlyFee.toFixed(2)} per hour
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {loadingSlots ? (
              <p className="text-sm text-slate-500">Loading available slots...</p>
            ) : slots.length > 0 ? (
              <div>
                <label className="label">Select a time slot *</label>
                <select
                  className="input"
                  value={selectedSlotIdx ?? ''}
                  onChange={(e) => setSelectedSlotIdx(Number(e.target.value))}
                  required
                >
                  {slots.map((slot, idx) => (
                    <option key={slot.start} value={idx}>
                      {getSlotLabel(slot)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-800">No available time slots</p>
                <p className="text-xs text-amber-700 mt-1">
                  This tutor has not set their availability yet. Please check back later or
                  contact them directly.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-600">Estimated session total</span>
                <span className="text-lg font-bold text-slate-900">
                  ${finalSessionPrice.toFixed(2)}
                </span>
              </div>

              {selectedSlot && (
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <span>Session length</span>
                    <span>
                      {sessionHours.toFixed(sessionHours % 1 === 0 ? 0 : 2)} hour
                      {sessionHours === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Base price</span>
                    <span>${baseSessionPrice.toFixed(2)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex items-center justify-between gap-4 text-emerald-700">
                      <span>Coupon discount ({discountPercent}% off)</span>
                      <span>- ${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="label">Coupon code</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="inline-flex items-center justify-center rounded-xl bg-[#012c54] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#014a7a]"
                  >
                    Apply
                  </button>
                </div>
                {couponFeedback && (
                  <p
                    className={`mt-2 text-sm font-medium ${
                      couponFeedbackType === 'success' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {couponFeedback}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Share any goals or context (optional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Share any goals or context for this session."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  submitting || loadingSlots || slots.length === 0 || selectedSlotIdx === null
                }
              >
                {submitting ? 'Sending hire request...' : 'Confirm hire request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BookTutorModal
