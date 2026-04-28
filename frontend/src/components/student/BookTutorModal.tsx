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
  label: string
  start: string
  end: string
}

const nowLocal = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

function generateSlots(availabilities: any[]): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = []
  const now = new Date()
  const WEEKS = 3

  for (const avail of availabilities) {
    const days: string[] = Array.isArray(avail.daysAvailable) ? avail.daysAvailable : []
    const sessionDuration: number = avail.sessionDuration || 60
    const breakTime: number = avail.breakTime || 0

    for (const dayName of days) {
      const targetDay = DAY_MAP[dayName]
      if (targetDay === undefined) continue

      for (let week = 0; week < WEEKS; week++) {
        const date = new Date()
        const currentDay = date.getDay()
        let daysUntil = targetDay - currentDay
        if (daysUntil < 0) daysUntil += 7
        date.setDate(date.getDate() + daysUntil + week * 7)

        const [startH, startM] = (avail.startTime || '09:00').split(':').map(Number)
        const [endH, endM] = (avail.endTime || '17:00').split(':').map(Number)
        let slotStart = new Date(date)
        slotStart.setHours(startH, startM, 0, 0)
        const blockEnd = new Date(date)
        blockEnd.setHours(endH, endM, 0, 0)

        while (slotStart < blockEnd) {
          const slotEnd = new Date(slotStart.getTime() + sessionDuration * 60000)
          if (slotEnd > blockEnd) break
          if (slotStart > now) {
            slots.push({
              label: `${slotStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} \u2022 ${slotStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} \u2013 ${slotEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
            })
          }
          slotStart = new Date(slotStart.getTime() + (sessionDuration + breakTime) * 60000)
        }
      }
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 30)
}

const BookTutorModal = ({ tutor, isOpen, onClose, onBooked, onError }: BookTutorModalProps) => {
  const [startTime, setStartTime] = useState(nowLocal())
  const [endTime, setEndTime] = useState(nowLocal())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    if (isOpen && tutor?.id) {
      const initialStart = nowLocal()
      const initialEnd = new Date(new Date(initialStart).getTime() + 60 * 60 * 1000)
      initialEnd.setMinutes(initialEnd.getMinutes() - initialEnd.getTimezoneOffset())
      setStartTime(initialStart)
      setEndTime(initialEnd.toISOString().slice(0, 16))
      setNotes('')
      setError('')
      setSlots([])
      setSelectedSlotIdx(null)
      setLoadingSlots(true)
      api.get(`/student/tutors/${tutor.id}`)
        .then((res) => {
          const availabilities = res.data?.tutor?.availabilities ?? res.data?.availabilities ?? []
          const existingBookings: { startTime: string; endTime: string }[] = res.data?.tutor?.existingBookings ?? []
          const parsed = availabilities.map((a: any) => ({
            ...a,
            daysAvailable: typeof a.daysAvailable === 'string' ? JSON.parse(a.daysAvailable) : a.daysAvailable,
          }))
          const generated = generateSlots(parsed).filter((slot) =>
            !existingBookings.some(
              (b) => new Date(slot.start) < new Date(b.endTime) && new Date(slot.end) > new Date(b.startTime)
            )
          )
          setSlots(generated)
          if (generated.length > 0) setSelectedSlotIdx(0)
        })
        .catch(() => { /* fall back to datetime inputs */ })
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
      let bookingStart: Date
      let bookingEnd: Date

      if (slots.length > 0 && selectedSlotIdx !== null) {
        bookingStart = new Date(slots[selectedSlotIdx].start)
        bookingEnd = new Date(slots[selectedSlotIdx].end)
      } else {
        if (!startTime || !endTime) throw new Error('Please select both a start time and an end time.')
        bookingStart = new Date(startTime)
        bookingEnd = new Date(endTime)
        if (Number.isNaN(bookingStart.getTime()) || Number.isNaN(bookingEnd.getTime())) {
          throw new Error('The selected times are not valid. Please try again.')
        }
        if (bookingEnd <= bookingStart) throw new Error('End time must be after the start time.')
      }

      await api.post('/student/bookings', {
        tutorId: tutor.id,
        startTime: bookingStart.toISOString(),
        endTime: bookingEnd.toISOString(),
        notes: notes.trim() || undefined,
      })

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Hire {tutor.firstName} for a session</h2>
            <p className="text-sm text-slate-500">
              Set a time that works for you. We’ll notify the tutor to confirm the booking and next steps.
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
              {displayImage ? <img src={displayImage} alt={`${tutor.firstName}`} className="h-full w-full object-cover" /> : `${tutor.firstName?.charAt(0)}${tutor.lastName.charAt(0)}`}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {tutor.firstName} {tutor.lastName}
              </h3>
              <p className="text-sm text-slate-500">
                {tutor.city ? `${tutor.city}, ${tutor.state || tutor.country}` : tutor.country}
              </p>
              <p className="text-sm text-primary-600 font-medium mt-1">${tutor.hourlyFee.toFixed(2)} per hour</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {loadingSlots ? (
              <p className="text-sm text-slate-500">Loading available slots…</p>
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
                    <option key={slot.start} value={idx}>{slot.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  This tutor hasn’t set a schedule yet — pick any available time below.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start time *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      min={nowLocal()}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">End time *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      min={startTime}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

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
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg">{error}</div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sending hire request…' : 'Confirm hire request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BookTutorModal


