import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import BookingCardCapture, {
  CardCaptureHandle,
  SavedCard,
} from './BookingCardCapture'

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
  const [bookingMode, setBookingMode] = useState<'single' | 'multiple'>('single')
  const [selectedSlotIndices, setSelectedSlotIndices] = useState<number[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0)
  const [couponFirstSessionOnly, setCouponFirstSessionOnly] = useState(false)
  const [couponFeedback, setCouponFeedback] = useState('')
  const [couponFeedbackType, setCouponFeedbackType] = useState<'success' | 'error' | ''>('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState('new')
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [cardSetupError, setCardSetupError] = useState('')
  const cardCaptureRef = useRef<CardCaptureHandle>(null)

  useEffect(() => {
    if (isOpen && tutor?.id) {
      setNotes('')
      setError('')
      setSlots([])
      setSelectedSlotIdx(null)
      setBookingMode('single')
      setSelectedSlotIndices([])
      setLoadingSlots(true)
      setCouponCode('')
      setDiscountPercent(0)
      setCouponDiscountAmount(0)
      setCouponFirstSessionOnly(false)
      setCouponFeedback('')
      setCouponFeedbackType('')
      setSavedCards([])
      setSelectedCardId('new')
      setSetupClientSecret(null)
      setCardSetupError('')

      // Card is captured now; each session is charged only after completion.
      api
        .get('/student/payment-methods')
        .then((res) => {
          const cards: SavedCard[] = res.data?.paymentMethods ?? []
          setSavedCards(cards)
          if (cards.length > 0) setSelectedCardId(cards[0].id)
        })
        .catch(() => setSavedCards([]))

      api
        .post('/student/payment-methods/setup-intent')
        .then((res) => setSetupClientSecret(res.data?.clientSecret ?? null))
        .catch((err) =>
          setCardSetupError(
            err.response?.data?.error || 'Unable to prepare the card form. Please try again.'
          )
        )

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

  // Inside a day group the date is already the group heading, so show time only.
  const getSlotTimeLabel = (slot: AvailabilitySlot) => {
    const start = new Date(slot.start)
    const end = new Date(slot.end)
    const t = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return `${t(start)} – ${t(end)}`
  }

  // Slots arrive covering a rolling 14-day window. Grouping by calendar day
  // makes every day of that window visible in the dropdown rather than the
  // student scrolling one long flat list.
  const slotsByDay = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; slots: Array<{ slot: AvailabilitySlot; idx: number }> }>()

    slots.forEach((slot, idx) => {
      const start = new Date(slot.start)
      const key = start.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: start.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          }),
          slots: [],
        })
      }
      groups.get(key)!.slots.push({ slot, idx })
    })

    return Array.from(groups.values())
  }, [slots])

  const selectedSlots = useMemo(
    () => selectedSlotIndices.map((idx) => slots[idx]).filter(Boolean),
    [selectedSlotIndices, slots]
  )

  const toggleSeriesSlot = (idx: number) => {
    setSelectedSlotIndices((current) =>
      current.includes(idx) ? current.filter((value) => value !== idx) : [...current, idx].sort((a, b) => a - b)
    )
  }

  const addMatchingWeeklySlots = () => {
    if (selectedSlots.length === 0) return
    const weeklyPatterns = selectedSlots.map((slot) => {
      const start = new Date(slot.start)
      return {
        weekday: start.getDay(),
        hour: start.getHours(),
        minute: start.getMinutes(),
        duration: new Date(slot.end).getTime() - start.getTime(),
      }
    })

    const matches = slots.reduce<number[]>((indices, slot, idx) => {
      const start = new Date(slot.start)
      const duration = new Date(slot.end).getTime() - start.getTime()
      const isMatch = weeklyPatterns.some(
        (pattern) =>
          pattern.weekday === start.getDay() &&
          pattern.hour === start.getHours() &&
          pattern.minute === start.getMinutes() &&
          pattern.duration === duration
      )
      if (isMatch) indices.push(idx)
      return indices
    }, [])

    setSelectedSlotIndices(Array.from(new Set([...selectedSlotIndices, ...matches])).sort((a, b) => a - b))
  }

  if (!isOpen || !tutor) {
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const bookingSlots = bookingMode === 'multiple'
        ? selectedSlots
        : selectedSlotIdx !== null && slots[selectedSlotIdx]
          ? [slots[selectedSlotIdx]]
          : []
      if (bookingSlots.length === 0) throw new Error('Please select an available time slot.')
      if (bookingMode === 'multiple' && bookingSlots.length < 2) {
        throw new Error('Please select at least two sessions for a recurring booking.')
      }

      const bookingStart = new Date(bookingSlots[0].start)
      const bookingEnd = new Date(bookingSlots[0].end)

      const allowLocalPaymentBypass = import.meta.env.DEV && Boolean(cardSetupError)
      if (!cardCaptureRef.current && !allowLocalPaymentBypass) {
        throw new Error('The card form is not ready yet. Please wait a moment and try again.')
      }
      const paymentMethodId = allowLocalPaymentBypass
        ? undefined
        : await cardCaptureRef.current!.resolvePaymentMethod()

      const commonPayload = {
        tutorId: tutor.id,
        notes: notes.trim() || undefined,
        paymentMethodId,
        couponCode: discountPercent > 0 || couponDiscountAmount > 0 ? couponCode.trim() : undefined,
      }
      const response = bookingMode === 'multiple'
        ? await api.post('/student/bookings/series', {
            ...commonPayload,
            slots: bookingSlots.map((slot) => ({ startTime: slot.start, endTime: slot.end })),
          })
        : await api.post('/student/bookings', {
            ...commonPayload,
            startTime: bookingStart.toISOString(),
            endTime: bookingEnd.toISOString(),
          })

      if (discountPercent > 0 && couponCode.trim()) {
        localStorage.setItem(
          LOCAL_BOOKING_COUPON_KEY,
          JSON.stringify({
            bookingId: response.data?.booking?.id ?? response.data?.bookings?.[0]?.id ?? null,
            tutorId: tutor.id,
            startTime: bookingStart.toISOString(),
            endTime: bookingEnd.toISOString(),
            couponCode: couponCode.trim(),
            discountPercent,
            discountAmount: couponDiscountAmount,
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
  const pricedSlots = bookingMode === 'multiple' ? selectedSlots : selectedSlot ? [selectedSlot] : []
  const totalHours = pricedSlots.reduce(
    (sum, slot) => sum + Math.max(0, (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 3_600_000),
    0
  )
  const slotPrices = pricedSlots.map(
    (slot) => tutor.hourlyFee * Math.max(0, (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 3_600_000)
  )
  const baseSessionPrice = slotPrices.reduce((sum, price) => sum + price, 0)
  const percentDiscountBase = couponFirstSessionOnly ? (slotPrices[0] || 0) : baseSessionPrice
  const discountedSessionCount = couponFirstSessionOnly ? Math.min(1, pricedSlots.length) : pricedSlots.length
  const discountAmount = percentDiscountBase * (discountPercent / 100) + couponDiscountAmount * discountedSessionCount
  const finalSessionPrice = Math.max(0, baseSessionPrice - discountAmount)


  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setDiscountPercent(0)
      setCouponDiscountAmount(0)
      setCouponFirstSessionOnly(false)
      setCouponFeedback('Please enter a coupon code.')
      setCouponFeedbackType('error')
      return
    }

    setValidatingCoupon(true)
    try {
      const response = await api.post('/payments/coupons/validate', { couponCode: couponCode.trim() })
      setCouponCode(response.data.couponCode)
      setDiscountPercent(response.data.discountPercent)
      setCouponDiscountAmount(response.data.discountAmount || 0)
      setCouponFirstSessionOnly(Boolean(response.data.firstSessionOnly))
      setCouponFeedback(response.data.message)
      setCouponFeedbackType('success')
    } catch (err: any) {
      setDiscountPercent(0)
      setCouponDiscountAmount(0)
      setCouponFirstSessionOnly(false)
      setCouponFeedback(err.response?.data?.error || 'Unable to validate coupon right now.')
      setCouponFeedbackType('error')
    } finally {
      setValidatingCoupon(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] my-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
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

        {/* The card form makes this modal taller than most viewports, so the
            body scrolls while the header and action bar stay put. */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1 min-h-0">
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
            <div>
              <label className="label">Booking type</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setBookingMode('single')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    bookingMode === 'single' ? 'bg-white text-[#012c54] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  One session
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('multiple')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    bookingMode === 'multiple' ? 'bg-white text-[#012c54] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Multiple sessions
                </button>
              </div>
            </div>

            {loadingSlots ? (
              <p className="text-sm text-slate-500">Loading available slots...</p>
            ) : slots.length > 0 && bookingMode === 'single' ? (
              <div>
                <label className="label">Select a time slot *</label>
                <select
                  className="input"
                  value={selectedSlotIdx ?? ''}
                  onChange={(e) => setSelectedSlotIdx(Number(e.target.value))}
                  required
                >
                  {slotsByDay.map((group) => (
                    <optgroup key={group.key} label={group.label}>
                      {group.slots.map(({ slot, idx }) => (
                        <option key={slot.start} value={idx}>
                          {getSlotTimeLabel(slot)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ) : slots.length > 0 && bookingMode === 'multiple' ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label className="label mb-0">Select sessions *</label>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose at least two dates. Select one or more preferred weekly times, then add every matching week.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={selectedSlotIndices.length === 0}
                      onClick={addMatchingWeeklySlots}
                      className="rounded-lg border border-[#012c54] px-3 py-2 text-xs font-semibold text-[#012c54] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add same times weekly
                    </button>
                    <button
                      type="button"
                      disabled={selectedSlotIndices.length === 0}
                      onClick={() => setSelectedSlotIndices([])}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {slotsByDay.map((group) => (
                    <div key={group.key} className="rounded-lg bg-white p-3 shadow-sm">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.slots.map(({ slot, idx }) => {
                          const checked = selectedSlotIndices.includes(idx)
                          return (
                            <label
                              key={slot.start}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                checked
                                  ? 'border-blue-500 bg-blue-50 font-semibold text-[#012c54]'
                                  : 'border-slate-200 text-slate-700 hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSeriesSlot(idx)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              {getSlotTimeLabel(slot)}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-[#012c54]">
                  {selectedSlotIndices.length} session{selectedSlotIndices.length === 1 ? '' : 's'} selected
                </p>
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
                <span className="font-medium text-slate-600">
                  Estimated {bookingMode === 'multiple' ? 'series' : 'session'} total
                </span>
                <span className="text-lg font-bold text-slate-900">
                  ${finalSessionPrice.toFixed(2)}
                </span>
              </div>

              {pricedSlots.length > 0 && (
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <span>{bookingMode === 'multiple' ? `${pricedSlots.length} sessions` : 'Session length'}</span>
                    <span>
                      {totalHours.toFixed(totalHours % 1 === 0 ? 0 : 2)} hour
                      {totalHours === 1 ? '' : 's'} total
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Base price</span>
                    <span>${baseSessionPrice.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-emerald-700">
                      <span>
                        Coupon discount
                        {discountPercent > 0 && ` (${discountPercent}% off)`}
                      </span>
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
                    onChange={(event) => {
                      setCouponCode(event.target.value)
                      setDiscountPercent(0)
                      setCouponDiscountAmount(0)
                      setCouponFirstSessionOnly(false)
                      setCouponFeedback('')
                      setCouponFeedbackType('')
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon}
                    className="inline-flex items-center justify-center rounded-xl bg-[#012c54] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#014a7a]"
                  >
                    {validatingCoupon ? 'Checking...' : 'Apply'}
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

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div>
                <label className="label mb-0">Payment method *</label>
                <p className="text-xs text-slate-500 mt-1">
                  Your card is saved now but <strong>not charged upfront</strong>. Each session is
                  charged separately only after it is completed.
                </p>
              </div>

              {cardSetupError ? (
                import.meta.env.DEV ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Local test mode: Stripe is not configured, so no card will be saved or charged.
                  </p>
                ) : (
                  <p className="text-sm text-red-600">{cardSetupError}</p>
                )
              ) : (
                <BookingCardCapture
                  ref={cardCaptureRef}
                  savedCards={savedCards}
                  clientSecret={setupClientSecret}
                  selectedCardId={selectedCardId}
                  onSelectCard={setSelectedCardId}
                  disabled={submitting}
                />
              )}
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

            {/* Sticky so Confirm stays reachable without scrolling to the end. */}
            <div className="flex justify-end gap-3 pt-3 pb-1 sticky bottom-0 bg-white border-t border-slate-100 -mx-6 px-6">
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
                  submitting ||
                  loadingSlots ||
                  slots.length === 0 ||
                  (bookingMode === 'single' ? selectedSlotIdx === null : selectedSlotIndices.length < 2) ||
                  (!import.meta.env.DEV && Boolean(cardSetupError)) ||
                  (!import.meta.env.DEV && !setupClientSecret && savedCards.length === 0)
                }
              >
                {submitting
                  ? 'Sending hire request...'
                  : bookingMode === 'multiple'
                    ? `Request ${selectedSlotIndices.length} sessions`
                    : 'Confirm hire request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BookTutorModal
