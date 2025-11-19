import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'

interface ExperienceItem {
  id: string
  jobTitle: string
  company: string
  location: string
  startDate: string
  endDate?: string
  isCurrent: boolean
  description?: string
}

interface ExperienceForm {
  jobTitle: string
  company: string
  location: string
  startDate: string
  endDate?: string
  isCurrent: boolean
  description?: string
}

const Experience = () => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ExperienceForm>()
  const [experiences, setExperiences] = useState<ExperienceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const isCurrent = watch('isCurrent')

  useEffect(() => {
    fetchExperiences()
  }, [])

  useEffect(() => {
    if (isCurrent) {
      setValue('endDate', '')
    }
  }, [isCurrent, setValue])

  const fetchExperiences = async () => {
    try {
      const response = await api.get('/auth/me')
      setExperiences(response.data.tutor?.experiences || [])
    } catch (error) {
      console.error('Error fetching experiences:', error)
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

  const onSubmit = async (data: ExperienceForm) => {
    try {
      setLoading(true)
      let completion = 0
      const submitData = {
        ...data,
        startDate: convertDateToISO(data.startDate),
        endDate: data.endDate ? convertDateToISO(data.endDate) : undefined
      }
      if (editingId) {
        const response = await api.put(`/tutor/profile/experience/${editingId}`, submitData)
        setFeedback(response.data.message || 'Experience updated successfully')
      } else {
        const response = await api.post('/tutor/profile/experience', submitData)
        completion = response.data.profileCompletion ?? 0
        setFeedback('Experience added successfully')
      }
      window.dispatchEvent(new Event('tutor-profile-updated'))
      await fetchExperiences()
      reset()
      setEditingId(null)
      if (completion === 100) {
        setFeedback('Experience added successfully • Profile now complete!')
      }
      setTimeout(() => setFeedback(''), 3000)
    } catch (error) {
      console.error('Error saving experience:', error)
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

  const handleEdit = (exp: ExperienceItem) => {
    setEditingId(exp.id)
    setValue('jobTitle', exp.jobTitle)
    setValue('company', exp.company)
    setValue('location', exp.location)
    // Convert to date input format (YYYY-MM-DD) for the calendar
    setValue('startDate', formatDateStringToDateInput(exp.startDate))
    setValue('endDate', exp.endDate ? formatDateStringToDateInput(exp.endDate) : '')
    setValue('isCurrent', exp.isCurrent)
    setValue('description', exp.description || '')
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this experience?')) {
      try {
        const response = await api.delete(`/tutor/profile/experience/${id}`)
        await fetchExperiences()
        if (response.data?.profileCompletion !== undefined) {
          if (response.data.profileCompletion === 100) {
            setFeedback('Experience removed • Profile still complete')
          } else {
            setFeedback('Experience removed')
          }
          setTimeout(() => setFeedback(''), 3000)
        }
        window.dispatchEvent(new Event('tutor-profile-updated'))
      } catch (error) {
        console.error('Error deleting experience:', error)
      }
    }
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
  }

  return (
    <div>
      <h2 className="section-title">Teaching Experience</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold">{editingId ? 'Edit Experience' : 'Add New Experience'}</h3>

        {feedback && (
          <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-2 rounded-lg">
            {feedback}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Job Title *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Math Tutor"
              {...register('jobTitle', { required: 'Job title is required' })}
            />
            {errors.jobTitle && <p className="error-text">{errors.jobTitle.message}</p>}
          </div>

          <div>
            <label className="label">Company/Institution *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., ABC Learning Center"
              {...register('company', { required: 'Company is required' })}
            />
            {errors.company && <p className="error-text">{errors.company.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Location *</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., New York, NY"
            {...register('location', { required: 'Location is required' })}
          />
          {errors.location && <p className="error-text">{errors.location.message}</p>}
        </div>


        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Start Date * (MM/DD/YYYY)</label>
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
            <label className="label">End Date (MM/DD/YYYY)</label>
            <input
              type="date"
              className="input"
              disabled={isCurrent}
              {...register('endDate')}
            />
            {watch('endDate') && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {formatDateToMMDDYYYY(watch('endDate'))}
              </p>
            )}
            {errors.endDate && <p className="error-text">{errors.endDate.message}</p>}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isCurrent"
            className="mr-2"
            {...register('isCurrent')}
          />
          <label htmlFor="isCurrent" className="text-sm text-gray-700">
            I currently work here
          </label>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Brief description of your role and responsibilities..."
            {...register('description')}
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : editingId ? 'Update Experience' : 'Add Experience'}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List of experiences */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Experiences</h3>
        {experiences.length === 0 ? (
          <p className="text-gray-600">No experiences added yet.</p>
        ) : (
          experiences.map((exp) => (
            <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg">{exp.jobTitle}</h4>
                  <p className="text-gray-700">{exp.company}</p>
                  <p className="text-sm text-gray-600">{exp.location}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(exp)} className="text-primary-600 hover:text-primary-700">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(exp.id)} className="text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {formatDateToMMDDYYYY(exp.startDate)} - {exp.isCurrent ? 'Present' : exp.endDate ? formatDateToMMDDYYYY(exp.endDate) : 'N/A'}
              </p>
              {exp.description && (
                <p className="mt-2 text-gray-700">{exp.description}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Experience

