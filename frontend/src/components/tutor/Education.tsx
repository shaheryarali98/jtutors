import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'

// 1. Define the props interface
interface EducationProps {
  onSaveSuccess: () => void; // Function to call on successful save
}

interface EducationItem {
  id: string
  degreeTitle: string
  university: string
  location: string
  startDate: string
  endDate?: string
  isOngoing: boolean
}

interface EducationForm {
  degreeTitle: string
  university: string
  location: string
  startDate: string
  endDate?: string
  isOngoing: boolean
}

// 2. Update the component signature to accept the prop
const Education = ({ onSaveSuccess }: EducationProps) => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<EducationForm>()
  const [educations, setEducations] = useState<EducationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const isOngoing = watch('isOngoing')

  useEffect(() => {
    fetchEducations()
  }, [])

  useEffect(() => {
    if (isOngoing) {
      setValue('endDate', '')
    }
  }, [isOngoing, setValue])

  const fetchEducations = async () => {
    try {
      const response = await api.get('/auth/me')
      setEducations(response.data.tutor?.educations || [])
    } catch (error) {
      console.error('Error fetching educations:', error)
    }
  }

  const formatDateToMMDDYYYY = (dateString: string) => {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }

  const convertDateToISO = (dateString: string) => {
    // Date input returns YYYY-MM-DD format
    return new Date(dateString).toISOString()
  }

  const onSubmit = async (data: EducationForm) => {
    try {
      setLoading(true)
      const submitData = {
        ...data,
        startDate: convertDateToISO(data.startDate),
        // Ensure endDate is undefined if isOngoing is true
        endDate: data.endDate && !data.isOngoing ? convertDateToISO(data.endDate) : undefined
      }
      
      let isNewEntry = false; // Flag to check if we are adding a new entry

      if (editingId) {
        const response = await api.put(`/tutor/profile/education/${editingId}`, submitData)
        setFeedback(response.data.message || 'Education updated successfully')
      } else {
        isNewEntry = true;
        const response = await api.post('/tutor/profile/education', submitData)
        setFeedback('Education added successfully')
        if (response.data.profileCompletion === 100) {
          setFeedback('Education added successfully • Profile now complete!')
        }
      }
      
      // 3. Execute the navigation callback only upon successfully ADDING a new item
      if (isNewEntry) {
        onSaveSuccess();
      }

      window.dispatchEvent(new Event('tutor-profile-updated'))
      await fetchEducations()
      reset()
      setEditingId(null)
      setTimeout(() => setFeedback(''), 3000)
    } catch (error) {
      console.error('Error saving education:', error)
      setFeedback('Error: Could not save education. Check the form fields.')
    } finally {
      setLoading(false)
    }
  }

  const formatDateStringToDateInput = (dateString: string) => {
    // Convert any date string to YYYY-MM-DD for date input
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleEdit = (edu: EducationItem) => {
    setEditingId(edu.id)
    setValue('degreeTitle', edu.degreeTitle)
    setValue('university', edu.university)
    setValue('location', edu.location)
    // Convert to date input format (YYYY-MM-DD) for the calendar
    setValue('startDate', formatDateStringToDateInput(edu.startDate))
    setValue('endDate', edu.endDate ? formatDateStringToDateInput(edu.endDate) : '')
    setValue('isOngoing', edu.isOngoing)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this education?')) {
      try {
        const response = await api.delete(`/tutor/profile/education/${id}`)
        if (response.data?.profileCompletion !== undefined) {
          setFeedback(response.data.profileCompletion === 100 ? 'Education removed • Profile remains complete' : 'Education removed')
          setTimeout(() => setFeedback(''), 3000)
        }
        window.dispatchEvent(new Event('tutor-profile-updated'))
        await fetchEducations()
      } catch (error) {
        console.error('Error deleting education:', error)
      }
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }

  return (
    <div>
      <h2 className="section-title">Education</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold">{editingId ? 'Edit Education' : 'Add New Education'}</h3>

        {feedback && (
          <div className={`px-4 py-2 rounded-lg ${
                feedback.startsWith('Error:') ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-green-50 border border-green-100 text-green-700'
            }`}>
            {feedback}
          </div>
        )}

        <div>
          <label className="label">Degree Title *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., Bachelor of Science in Mathematics"
            {...register('degreeTitle', { required: 'Degree title is required' })}
          />
          {errors.degreeTitle && <p className="error-text">{errors.degreeTitle.message}</p>}
        </div>

        <div>
          <label className="label">University/Institute *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., Harvard University"
            {...register('university', { required: 'University is required' })}
          />
          {errors.university && <p className="error-text">{errors.university.message}</p>}
        </div>

        <div>
          <label className="label">Location *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., Cambridge, MA"
            {...register('location', { required: 'Location is required' })}
          />
          {errors.location && <p className="error-text">{errors.location.message}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Start Date * (YYYY-MM-DD)</label>
            <input
              type="date"
              className="input"
              {...register('startDate', { 
                required: 'Start date is required'
              })}
            />
            {watch('startDate') && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {formatDateToMMDDYYYY(watch('startDate'))}
              </p>
            )}
            {errors.startDate && <p className="error-text">{errors.startDate.message}</p>}
          </div>

          <div>
            <label className="label">End Date (YYYY-MM-DD)</label>
            <input
              type="date"
              className="input"
              disabled={isOngoing}
              {...register('endDate')}
            />
            {(() => {
              const endDate = watch('endDate')
              return endDate && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {formatDateToMMDDYYYY(endDate)}
                </p>
              )
            })()}
            {errors.endDate && <p className="error-text">{errors.endDate.message}</p>}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isOngoing"
            className="mr-2"
            {...register('isOngoing')}
          />
          <label htmlFor="isOngoing" className="text-sm text-gray-700">
            This degree is currently ongoing
          </label>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : editingId ? 'Update Education' : 'Add Education'}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List of educations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Education</h3>
        {educations.length === 0 ? (
          <p className="text-gray-600">No education added yet.</p>
        ) : (
          educations.map((edu) => (
            <div key={edu.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg">{edu.degreeTitle}</h4>
                  <p className="text-gray-700">{edu.university}</p>
                  <p className="text-sm text-gray-600">{edu.location}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(edu)} className="text-primary-600 hover:text-primary-700">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(edu.id)} className="text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {formatDateToMMDDYYYY(edu.startDate)} - {edu.isOngoing ? 'Ongoing' : edu.endDate ? formatDateToMMDDYYYY(edu.endDate) : 'N/A'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Education