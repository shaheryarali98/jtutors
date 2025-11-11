import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'

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

const Education = () => {
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

  const onSubmit = async (data: EducationForm) => {
    try {
      setLoading(true)
      if (editingId) {
        const response = await api.put(`/tutor/profile/education/${editingId}`, data)
        setFeedback(response.data.message || 'Education updated successfully')
      } else {
        const response = await api.post('/tutor/profile/education', data)
        setFeedback('Education added successfully')
        if (response.data.profileCompletion === 100) {
          setFeedback('Education added successfully • Profile now complete!')
        }
      }
      window.dispatchEvent(new Event('tutor-profile-updated'))
      await fetchEducations()
      reset()
      setEditingId(null)
      setTimeout(() => setFeedback(''), 3000)
    } catch (error) {
      console.error('Error saving education:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (edu: EducationItem) => {
    setEditingId(edu.id)
    setValue('degreeTitle', edu.degreeTitle)
    setValue('university', edu.university)
    setValue('location', edu.location)
    setValue('startDate', edu.startDate.split('T')[0])
    setValue('endDate', edu.endDate ? edu.endDate.split('T')[0] : '')
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
          <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-2 rounded-lg">
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
            <label className="label">Start Date *</label>
            <input
              type="date"
              className="input"
              {...register('startDate', { required: 'Start date is required' })}
            />
            {errors.startDate && <p className="error-text">{errors.startDate.message}</p>}
          </div>

          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              className="input"
              disabled={isOngoing}
              {...register('endDate')}
            />
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
                {new Date(edu.startDate).toLocaleDateString()} - {edu.isOngoing ? 'Ongoing' : edu.endDate ? new Date(edu.endDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Education

