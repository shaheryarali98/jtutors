import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'

interface AvailabilityItem {
  id: string
  blockTitle: string
  daysAvailable: string[]
  startTime: string
  endTime: string
  breakTime: number
  sessionDuration: number
}

interface AvailabilityForm {
  blockTitle: string
  daysAvailable: string[]
  startTime: string
  endTime: string
  breakTime: number
  sessionDuration: number
}

type SlotPreview = {
  valid: boolean
  error?: string
  recommendation?: string
  sessionsPerDay?: number
  leftoverMinutes?: number
  alternatives?: Array<{ sessionDuration: number; breakTime: number; sessionsPerDay: number; suggestedEnd: string }>
  slots?: Array<{ start: string; end: string }>
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const sessionDurations = Array.from({ length: 16 }, (_, i) => 15 + i * 5)
const breakSuggestions = [0, 5, 10, 15, 20, 30]

const parseTimeToMinutes = (value?: string) => {
  if (!value) return null
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  return hour * 60 + minute
}

const minutesToTimeText = (totalMinutes: number) => {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hour24 = Math.floor(normalized / 60)
  const minute = normalized % 60
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${suffix}`
}

const minutesToTimeInputValue = (totalMinutes: number) => {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hour24 = Math.floor(normalized / 60)
  const minute = normalized % 60
  return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

const getSessionsPerDay = (blockDuration: number, session: number, breakMinutes: number) => {
  const interval = session + breakMinutes
  if (interval <= 0 || blockDuration < session) return 0
  return Math.floor((blockDuration + breakMinutes) / interval)
}

const buildSlotPreview = (
  startTime?: string,
  endTime?: string,
  sessionDuration?: number,
  breakTime?: number
): SlotPreview | null => {
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  const session = Number(sessionDuration)
  const breakMinutes = Number.isFinite(Number(breakTime)) ? Math.max(0, Number(breakTime)) : 0

  if (startMinutes === null || endMinutes === null || !Number.isFinite(session) || session <= 0) {
    return null
  }

  if (endMinutes <= startMinutes) {
    return {
      valid: false,
      error: 'End time must be after start time.',
      recommendation: 'End time is auto-adjusted when needed. Pick start time and duration first.',
    }
  }

  if (session < 15 || session > 90 || session % 5 !== 0) {
    return {
      valid: false,
      error: 'Session duration must be in 5-minute steps from 15 to 90.',
      recommendation: 'Use one of: 15, 20, 25 ... up to 90 minutes.',
    }
  }

  const blockDuration = endMinutes - startMinutes
  const sessionsPerDay = getSessionsPerDay(blockDuration, session, breakMinutes)

  if (sessionsPerDay < 1) {
    return {
      valid: false,
      error: 'Time range is shorter than one session.',
      recommendation: `Increase end time to at least ${minutesToTimeText(startMinutes + session)}.`,
    }
  }

  const interval = session + breakMinutes
  const slots: Array<{ start: string; end: string }> = []
  let cursor = startMinutes
  while (cursor + session <= endMinutes) {
    slots.push({
      start: minutesToTimeText(cursor),
      end: minutesToTimeText(cursor + session),
    })
    cursor += interval
  }

  const usedMinutes = sessionsPerDay * session + Math.max(0, sessionsPerDay - 1) * breakMinutes
  const leftoverMinutes = Math.max(0, blockDuration - usedMinutes)

  const alternatives = sessionDurations
    .flatMap((duration) =>
      breakSuggestions.map((candidateBreak) => {
        const candidateSessions = getSessionsPerDay(blockDuration, duration, candidateBreak)
        if (candidateSessions < 1) return null
        const candidateUsed = candidateSessions * duration + Math.max(0, candidateSessions - 1) * candidateBreak
        const remainder = Math.max(0, blockDuration - candidateUsed)
        return {
          sessionDuration: duration,
          breakTime: candidateBreak,
          sessionsPerDay: candidateSessions,
          suggestedEnd: minutesToTimeText(startMinutes + candidateUsed),
          score:
            Math.abs(duration - session) +
            Math.abs(candidateBreak - breakMinutes) +
            remainder,
        }
      })
    )
    .filter((item): item is { sessionDuration: number; breakTime: number; sessionsPerDay: number; suggestedEnd: string; score: number } => Boolean(item))
    .filter((item) => !(item.sessionDuration === session && item.breakTime === breakMinutes))
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(({ score: _score, ...rest }) => rest)

  return {
    valid: true,
    sessionsPerDay,
    leftoverMinutes,
    alternatives,
    slots,
  }
}

const Availability = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AvailabilityForm>({
    defaultValues: {
      breakTime: 0,
      sessionDuration: 60,
    },
  })

  const [availabilities, setAvailabilities] = useState<AvailabilityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const watchedStartTime = watch('startTime')
  const watchedEndTime = watch('endTime')
  const watchedSessionDuration = watch('sessionDuration')
  const watchedBreakTime = watch('breakTime')

  const slotPreview = useMemo(
    () => buildSlotPreview(watchedStartTime, watchedEndTime, watchedSessionDuration, watchedBreakTime),
    [watchedStartTime, watchedEndTime, watchedSessionDuration, watchedBreakTime]
  )

  useEffect(() => {
    const startMinutes = parseTimeToMinutes(watchedStartTime)
    const endMinutes = parseTimeToMinutes(watchedEndTime)
    const session = Number(watchedSessionDuration)

    if (startMinutes === null || !Number.isFinite(session) || session <= 0) {
      return
    }

    const minimumEnd = startMinutes + session
    if (endMinutes === null || endMinutes <= startMinutes || endMinutes < minimumEnd) {
      const adjustedEnd = minutesToTimeInputValue(minimumEnd)
      if (watchedEndTime !== adjustedEnd) {
        setValue('endTime', adjustedEnd, { shouldDirty: true, shouldValidate: true })
      }
    }
  }, [watchedStartTime, watchedEndTime, watchedSessionDuration, setValue])

  useEffect(() => {
    fetchAvailabilities()
  }, [])

  const fetchAvailabilities = async () => {
    try {
      const response = await api.get('/auth/me')
      setAvailabilities(response.data.tutor?.availabilities || [])
    } catch (error) {
      console.error('Error fetching availabilities:', error)
    }
  }

  const onSubmit = async (data: AvailabilityForm) => {
    if (selectedDays.length === 0) {
      setErrorMessage('Please select at least one day of availability.')
      return
    }

    if (!slotPreview || !slotPreview.valid) {
      setErrorMessage(
        slotPreview?.recommendation
          ? `${slotPreview.error} ${slotPreview.recommendation}`
          : 'Please configure a valid slot pattern before saving.'
      )
      return
    }

    try {
      setLoading(true)
      setFeedback('')
      setErrorMessage('')

      const payload = {
        ...data,
        daysAvailable: selectedDays,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }

      if (editingId) {
        const response = await api.put(`/tutor/profile/availability/${editingId}`, payload)
        setFeedback(response.data.message || 'Availability updated successfully')
      } else {
        const response = await api.post('/tutor/profile/availability', payload)
        if (response.data.profileCompletion === 100) {
          setFeedback('Availability added - Profile now complete!')
        } else {
          setFeedback('Availability added successfully')
        }
      }

      await fetchAvailabilities()
      reset()
      setSelectedDays([])
      setEditingId(null)
      window.dispatchEvent(new Event('tutor-profile-updated'))
      setTimeout(() => setFeedback(''), 3000)
    } catch (error: any) {
      console.error('Error saving availability:', error)
      const apiError = error?.response?.data?.error
      const recommendation = error?.response?.data?.recommendation
      setErrorMessage(
        recommendation
          ? `${apiError || 'Invalid availability settings.'} ${recommendation}`
          : apiError || 'Error saving availability block. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (avail: AvailabilityItem) => {
    setEditingId(avail.id)
    setValue('blockTitle', avail.blockTitle)
    setValue('startTime', avail.startTime)
    setValue('endTime', avail.endTime)
    setValue('breakTime', avail.breakTime)
    setValue('sessionDuration', avail.sessionDuration)
    setSelectedDays(avail.daysAvailable)
    setErrorMessage('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this availability block?')) return

    try {
      const response = await api.delete(`/tutor/profile/availability/${id}`)
      await fetchAvailabilities()
      if (response.data?.profileCompletion !== undefined) {
        setFeedback(
          response.data.profileCompletion === 100
            ? 'Availability removed - Profile still complete'
            : 'Availability removed'
        )
        setTimeout(() => setFeedback(''), 3000)
      }
      window.dispatchEvent(new Event('tutor-profile-updated'))
    } catch (error: any) {
      console.error('Error deleting availability:', error)
      setErrorMessage(error?.response?.data?.error || 'Error deleting availability block')
    }
  }

  const handleCancel = () => {
    reset()
    setSelectedDays([])
    setEditingId(null)
    setErrorMessage('')
  }

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  return (
    <div>
      <h2 className="section-title">Calendar & Availability</h2>
      <p className="text-gray-600 mb-6">Set your available hours for tutoring sessions</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold">{editingId ? 'Edit Availability' : 'Add Availability Block'}</h3>

        {feedback && (
          <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-2 rounded-lg">
            {feedback}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-lg">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="label">Block Title *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., Weekday Morning Sessions"
            {...register('blockTitle', { required: 'Block title is required' })}
          />
          {errors.blockTitle && <p className="error-text">{errors.blockTitle.message}</p>}
        </div>

        <div>
          <label className="label">Days Available *</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                  selectedDays.includes(day)
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          {selectedDays.length === 0 && <p className="error-text">Please select at least one day</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Start Time *</label>
            <input
              type="time"
              className="input"
              {...register('startTime', { required: 'Start time is required' })}
            />
            {errors.startTime && <p className="error-text">{errors.startTime.message}</p>}
          </div>

          <div>
            <label className="label">End Time *</label>
            <input
              type="time"
              className="input"
              {...register('endTime', { required: 'End time is required' })}
            />
            {errors.endTime && <p className="error-text">{errors.endTime.message}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Break Time (minutes)</label>
            <input
              type="number"
              min="0"
              className="input"
              {...register('breakTime', { valueAsNumber: true })}
            />
          </div>

          <div>
            <label className="label">Session Duration (minutes) *</label>
            <select
              className="input"
              {...register('sessionDuration', {
                required: 'Session duration is required',
                valueAsNumber: true,
              })}
            >
              {sessionDurations.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} minutes
                </option>
              ))}
            </select>
            {errors.sessionDuration && <p className="error-text">{errors.sessionDuration.message}</p>}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-semibold text-slate-900 mb-2">Live Slot Preview</h4>
          {!slotPreview ? (
            <p className="text-sm text-slate-600">Select start time, end time, duration, and break to preview generated slots.</p>
          ) : !slotPreview.valid ? (
            <div className="text-sm text-red-700 space-y-1">
              <p className="font-medium">{slotPreview.error}</p>
              {slotPreview.recommendation && <p>{slotPreview.recommendation}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-green-700 font-medium">
                {slotPreview.sessionsPerDay} session(s) will be created per selected day.
              </p>
              {typeof slotPreview.leftoverMinutes === 'number' && slotPreview.leftoverMinutes > 0 && (
                <p className="text-sm text-amber-700">
                  {slotPreview.leftoverMinutes} minute(s) remain unused at the end of the block.
                </p>
              )}
              <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-700">
                {slotPreview.slots?.map((slot, index) => (
                  <p key={`${slot.start}-${slot.end}`} className="bg-white border border-slate-200 rounded px-2 py-1">
                    {index + 1}. {slot.start} - {slot.end}
                  </p>
                ))}
              </div>
              {slotPreview.alternatives && slotPreview.alternatives.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-medium text-slate-800">Alternative setups</p>
                  <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-700 mt-1">
                    {slotPreview.alternatives.map((alt) => (
                      <p
                        key={`${alt.sessionDuration}-${alt.breakTime}`}
                        className="bg-white border border-slate-200 rounded px-2 py-1"
                      >
                        {alt.sessionDuration}m session + {alt.breakTime}m break {'->'} {alt.sessionsPerDay} session(s), end near {alt.suggestedEnd}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading || selectedDays.length === 0} className="btn btn-primary">
            {loading ? 'Saving...' : editingId ? 'Update Availability' : 'Add Availability'}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Availability Blocks</h3>
        {availabilities.length === 0 ? (
          <p className="text-gray-600">No availability blocks added yet.</p>
        ) : (
          availabilities.map((avail) => (
            <div key={avail.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-lg">{avail.blockTitle}</h4>
                  <p className="text-gray-700">
                    {avail.startTime} - {avail.endTime}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(avail)} className="text-primary-600 hover:text-primary-700">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(avail.id)} className="text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {avail.daysAvailable.map((day) => (
                  <span key={day} className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                    {day}
                  </span>
                ))}
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>Session Duration: {avail.sessionDuration} minutes</p>
                <p>Break Time: {avail.breakTime} minutes</p>
                {(() => {
                  const preview = buildSlotPreview(
                    avail.startTime,
                    avail.endTime,
                    avail.sessionDuration,
                    avail.breakTime
                  )
                  return (
                    <p>
                      Generated Sessions/Day: {preview?.valid ? preview.sessionsPerDay : 'Invalid configuration'}
                    </p>
                  )
                })()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Availability
