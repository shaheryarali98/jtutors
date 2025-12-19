import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'

// 1. Define the props interface
interface AvailabilityProps {
  onSaveSuccess: () => void; // Function to call on successful save/add
}

interface AvailabilityItem {
  id: string
  blockTitle: string
  daysAvailable: string[]
  startTime: string
  endTime: string
  breakTime: number
  sessionDuration: number
  numberOfSlots: number
}

interface AvailabilityForm {
  blockTitle: string
  daysAvailable: string[]
  startTime: string
  endTime: string
  breakTime: number
  sessionDuration: number
  numberOfSlots: number
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const sessionDurations = [30, 45, 60, 90, 120]

// 2. Update the component signature to accept the prop
const Availability = ({ onSaveSuccess }: AvailabilityProps) => {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<AvailabilityForm>({
    defaultValues: {
      breakTime: 0,
      sessionDuration: 60,
      numberOfSlots: 1
    }
  })
  const [availabilities, setAvailabilities] = useState<AvailabilityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

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
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    try {
      setLoading(true)
      setFeedback('')
      setErrorMessage('')
      
      const payload = {
        ...data,
        daysAvailable: selectedDays
      }

      let isNewEntry = false;

      if (editingId) {
        const response = await api.put(`/tutor/profile/availability/${editingId}`, payload)
        setFeedback(response.data.message || 'Availability updated successfully')
      } else {
        isNewEntry = true;
        const response = await api.post('/tutor/profile/availability', payload)
        if (response.data.profileCompletion === 100) {
          setFeedback('Availability added • Profile now complete!')
        } else {
          setFeedback('Availability added successfully')
        }
      }
      
      // 3. Execute the navigation callback only upon successfully ADDING a new item
//       if (isNewEntry) {
//         onSaveSuccess();
//       }

      await fetchAvailabilities()
      reset()
      setSelectedDays([])
      setEditingId(null)
      window.dispatchEvent(new Event('tutor-profile-updated'))
      setTimeout(() => setFeedback(''), 3000)
    } catch (error) {
      console.error('Error saving availability:', error)
      setErrorMessage('Error saving availability block. Please try again.')
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
    setValue('numberOfSlots', avail.numberOfSlots)
    setSelectedDays(avail.daysAvailable)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this availability block?')) {
      try {
        const response = await api.delete(`/tutor/profile/availability/${id}`)
        await fetchAvailabilities()
        if (response.data?.profileCompletion !== undefined) {
          setFeedback(
            response.data.profileCompletion === 100
              ? 'Availability removed • Profile still complete'
              : 'Availability removed'
          )
          setTimeout(() => setFeedback(''), 3000)
        }
        window.dispatchEvent(new Event('tutor-profile-updated'))
      } catch (error) {
        console.error('Error deleting availability:', error)
        setErrorMessage('Error deleting availability block')
      }
    }
  }

  const handleCancel = () => {
    reset()
    setSelectedDays([])
    setEditingId(null)
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
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
            {daysOfWeek.map(day => (
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
          {selectedDays.length === 0 && (
            <p className="error-text">Please select at least one day</p>
          )}
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
              {...register('sessionDuration', { required: 'Session duration is required', valueAsNumber: true })}
            >
              {sessionDurations.map(duration => (
                <option key={duration} value={duration}>
                  {duration} minutes
                </option>
              ))}
            </select>
            {errors.sessionDuration && <p className="error-text">{errors.sessionDuration.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Number of Appointment Slots *</label>
          <input
            type="number"
            min="1"
            max="10"
            className="input"
            {...register('numberOfSlots', { 
              required: 'Number of slots is required',
              valueAsNumber: true,
              min: { value: 1, message: 'Minimum 1 slot' }
            })}
          />
          {errors.numberOfSlots && <p className="error-text">{errors.numberOfSlots.message}</p>}
          <p className="text-sm text-gray-600 mt-1">
            Number of students that can book the same time slot
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            type="submit" 
            disabled={loading || selectedDays.length === 0} 
            className="btn btn-primary"
          >
            {loading ? 'Saving...' : editingId ? 'Update Availability' : 'Add Availability'}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List of availabilities */}
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
                {avail.daysAvailable.map(day => (
                  <span key={day} className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                    {day}
                  </span>
                ))}
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>Session Duration: {avail.sessionDuration} minutes</p>
                <p>Break Time: {avail.breakTime} minutes</p>
                <p>Available Slots: {avail.numberOfSlots}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Availability