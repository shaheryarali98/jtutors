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

const nowLocal = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

const BookTutorModal = ({ tutor, isOpen, onClose, onBooked, onError }: BookTutorModalProps) => {
  const [startTime, setStartTime] = useState(nowLocal())
  const [endTime, setEndTime] = useState(nowLocal())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      const initialStart = nowLocal()
      const initialEnd = new Date(new Date(initialStart).getTime() + 60 * 60 * 1000)
      initialEnd.setMinutes(initialEnd.getMinutes() - initialEnd.getTimezoneOffset())
      setStartTime(initialStart)
      setEndTime(initialEnd.toISOString().slice(0, 16))
      setNotes('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen || !tutor) {
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (!startTime || !endTime) {
        throw new Error('Please select both a start time and an end time.')
      }

      const start = new Date(startTime)
      const end = new Date(endTime)

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('The selected times are not valid. Please try again.')
      }

      if (end <= start) {
        throw new Error('End time must be after the start time.')
      }

      await api.post('/student/bookings', {
        tutorId: tutor.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
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


