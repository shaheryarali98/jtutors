import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'

interface PersonalInfoForm {
  firstName: string
  lastName: string
  gender: string
  gradesCanTeach: string[]
  hourlyFee: number
  tagline: string
  country: string
  state: string
  city: string
  address: string
  zipcode: string
  languagesSpoken: string[]
}

const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'College']

const PersonalInformation = () => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<PersonalInfoForm>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [imageMessage, setImageMessage] = useState('')
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([''])
  const [profileImage, setProfileImage] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me')
        const tutor = response.data.tutor
        if (tutor) {
          setValue('firstName', tutor.firstName || '')
          setValue('lastName', tutor.lastName || '')
          setValue('gender', tutor.gender || '')
          setValue('hourlyFee', tutor.hourlyFee || 20)
          setValue('tagline', tutor.tagline || '')
          setValue('country', tutor.country || '')
          setValue('state', tutor.state || '')
          setValue('city', tutor.city || '')
          setValue('address', tutor.address || '')
          setValue('zipcode', tutor.zipcode || '')
          setSelectedGrades(tutor.gradesCanTeach || [])
          setLanguages(tutor.languagesSpoken?.length ? tutor.languagesSpoken : [''])
          setProfileImage(tutor.profileImage || '')
          if (tutor.profileCompletionPercentage) {
            setProfileCompletion(tutor.profileCompletionPercentage)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
    fetchProfile()
  }, [setValue])

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('image', file)
      const response = await api.post('/uploads/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setProfileImage(response.data.url)
      setImageMessage('Profile photo uploaded. Remember to save your profile to keep this change.')
      setTimeout(() => setImageMessage(''), 3000)
      window.dispatchEvent(new Event('tutor-profile-updated'))
    } catch (error) {
      console.error('Error uploading profile image:', error)
    } finally {
      setUploadingImage(false)
    }
  }

  const onSubmit = async (data: PersonalInfoForm) => {
    try {
      setLoading(true)
      setSuccess(false)
      const response = await api.put('/tutor/profile/personal', {
        ...data,
        gradesCanTeach: selectedGrades,
        languagesSpoken: languages.filter(l => l.trim() !== ''),
        profileImage
      })
      setProfileCompletion(response.data.profileCompletion)
      if (response.data.profileCompletion === 100) {
        setTimeout(() => navigate('/tutor/dashboard'), 1400)
      }
      setSuccess(true)
      window.dispatchEvent(new Event('tutor-profile-updated'))
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error updating personal info:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev => 
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    )
  }

  const addLanguage = () => {
    setLanguages([...languages, ''])
  }

  const updateLanguage = (index: number, value: string) => {
    const newLanguages = [...languages]
    newLanguages[index] = value
    setLanguages(newLanguages)
  }

  const removeLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 className="section-title">Personal Information</h2>
      
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">
          Personal information updated successfully!
        </div>
      )}
      {imageMessage && (
        <div className="bg-blue-50 text-blue-600 p-3 rounded-lg mb-4">
          {imageMessage}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 p-5 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full border-4 border-white shadow bg-primary-50 overflow-hidden flex items-center justify-center text-3xl text-primary-500">
            {profileImage ? (
              <img src={resolveImageUrl(profileImage)} alt="Tutor profile" className="h-full w-full object-cover" />
            ) : (
              '📷'
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Profile Photo</h3>
            <p className="text-sm text-slate-600">A friendly headshot builds trust with students.</p>
          </div>
        </div>
        <label className="btn btn-outline cursor-pointer">
          {uploadingImage ? 'Uploading...' : profileImage ? 'Change Photo' : 'Upload Photo'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            disabled={uploadingImage}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                handleImageUpload(file)
              }
            }}
          />
        </label>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">First Name *</label>
            <input
              type="text"
              className="input"
              {...register('firstName', { required: 'First name is required' })}
            />
            {errors.firstName && <p className="error-text">{errors.firstName.message}</p>}
          </div>

          <div>
            <label className="label">Last Name *</label>
            <input
              type="text"
              className="input"
              {...register('lastName', { required: 'Last name is required' })}
            />
            {errors.lastName && <p className="error-text">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Gender</label>
          <select className="input" {...register('gender')}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </div>

        <div>
          <label className="label">Grades You Can Teach *</label>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
            {grades.map(grade => (
              <button
                key={grade}
                type="button"
                onClick={() => toggleGrade(grade)}
                className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                  selectedGrades.includes(grade)
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Hourly Fee (USD) * ($20 - $500)</label>
          <input
            type="number"
            min="20"
            max="500"
            className="input"
            {...register('hourlyFee', { 
              required: 'Hourly fee is required',
              min: { value: 20, message: 'Minimum fee is $20' },
              max: { value: 500, message: 'Maximum fee is $500' }
            })}
          />
          {errors.hourlyFee && <p className="error-text">{errors.hourlyFee.message}</p>}
        </div>

        <div>
          <label className="label">Tagline / Short Bio</label>
          <textarea
            className="input"
            rows={3}
            placeholder="A brief description about yourself and your teaching style..."
            {...register('tagline')}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Country *</label>
            <input
              type="text"
              className="input"
              {...register('country', { required: 'Country is required' })}
            />
            {errors.country && <p className="error-text">{errors.country.message}</p>}
          </div>

          <div>
            <label className="label">State / Province</label>
            <input
              type="text"
              className="input"
              {...register('state')}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">City *</label>
            <input
              type="text"
              className="input"
              {...register('city', { required: 'City is required' })}
            />
            {errors.city && <p className="error-text">{errors.city.message}</p>}
          </div>

          <div>
            <label className="label">Zipcode</label>
            <input
              type="text"
              className="input"
              {...register('zipcode')}
            />
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <input
            type="text"
            className="input"
            {...register('address')}
          />
        </div>

        <div>
          <label className="label">Languages Spoken</label>
          <div className="space-y-2">
            {languages.map((lang, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  className="input"
                  value={lang}
                  onChange={(e) => updateLanguage(index, e.target.value)}
                  placeholder="e.g., English"
                />
                {languages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLanguage(index)}
                    className="btn btn-secondary"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addLanguage}
              className="btn btn-outline"
            >
              + Add Language
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full md:w-auto"
        >
          {loading ? 'Saving...' : 'Save Personal Information'}
        </button>
      </form>

      {profileCompletion === 100 && (
        <div className="mt-6 bg-primary-50 border border-primary-100 rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary-700">Profile 100% complete!</h3>
            <p className="text-sm text-primary-600">
              Fantastic work. You’ll be redirected to your tutor dashboard. You can always revisit to update details.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/tutor/dashboard')}
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

export default PersonalInformation

