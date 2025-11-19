import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import { LANGUAGE_OPTIONS } from '../../constants/options'
import { usePlatformSettings } from '../../store/settingsStore'

interface StudentProfileForm {
  firstName: string
  lastName: string
  gender: string
  grade: string
  tagline: string
  bio: string
  country: string
  state: string
  city: string
  zipcode: string
  introduction: string
}

const genderOptions = [
  { value: '', label: 'Choose gender' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]

const gradeOptions = [
  'Elementary School',
  'Middle School',
  'High School - Freshman',
  'High School - Sophomore',
  'High School - Junior',
  'High School - Senior',
  'Undergraduate',
  'Postgraduate',
  'Adult Learner',
]

const learningLocationOptions = ['My Place', "Teacher's home", 'Online']

const countryOptions = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'India',
  'Singapore',
  'United Arab Emirates',
  'Nigeria',
  'South Africa',
  'Other',
]

const StudentProfile = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<StudentProfileForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: '',
      grade: '',
      tagline: '',
      bio: '',
      country: '',
      state: '',
      city: '',
      address: '',
      zipcode: '',
      introduction: '',
    },
  })

  const [loading, setLoading] = useState(false)
  const [fetchingProfile, setFetchingProfile] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [languages, setLanguages] = useState<string[]>([])
  const [customLanguageInput, setCustomLanguageInput] = useState('')
  const [learningPreferences, setLearningPreferences] = useState<string[]>([])
  const { settings, fetchSettings } = usePlatformSettings()
  const navigate = useNavigate()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/student/profile')
        const student = response.data.student
        if (student) {
          setValue('firstName', student.firstName || '')
          setValue('lastName', student.lastName || '')
          setValue('gender', student.gender || '')
          setValue('grade', student.grade || '')
          setValue('tagline', student.tagline || '')
          setValue('bio', student.bio || '')
          setValue('country', student.country || '')
          setValue('state', student.state || '')
          setValue('city', student.city || '')
          setValue('zipcode', student.zipcode || '')
          setValue('introduction', student.introduction || '')
          setProfileImage(student.profileImage || '')
          setProfileCompleted(Boolean(student.profileCompleted))
          setLanguages(
            Array.isArray(student.languagesSpoken) && student.languagesSpoken.length > 0
              ? student.languagesSpoken
              : []
          )
          setLearningPreferences(
            Array.isArray(student.learningPreferences) ? student.learningPreferences : []
          )
        }
      } catch (err) {
        console.error('Error loading student profile:', err)
        setError('Unable to load your profile. Please refresh the page.')
      } finally {
        setFetchingProfile(false)
      }
    }

    fetchProfile()
  }, [setValue])

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)
      const response = await api.post('/uploads/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setProfileImage(response.data.url)
      setSuccess('Profile photo uploaded successfully. Remember to save your profile to keep this change.')
      setError('')
      setValidationError('')
      window.dispatchEvent(new Event('student-profile-updated'))
      setTimeout(() => setSuccess(''), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const toggleLanguage = (language: string) => {
    setLanguages((prev) =>
      prev.includes(language) ? prev.filter((lang) => lang !== language) : [...prev, language]
    )
  }

  const customLanguages = languages.filter((lang) => !LANGUAGE_OPTIONS.includes(lang))

  const handleAddCustomLanguage = () => {
    const trimmed = customLanguageInput.trim()
    if (!trimmed) return
    if (!languages.includes(trimmed)) {
      setLanguages((prev) => [...prev, trimmed])
    }
    setCustomLanguageInput('')
  }

  const removeCustomLanguage = (language: string) => {
    setLanguages((prev) => prev.filter((item) => item !== language))
  }

  const toggleLearningPreference = (preference: string) => {
    setLearningPreferences((prev) =>
      prev.includes(preference) ? prev.filter((item) => item !== preference) : [...prev, preference]
    )
  }

  const onSubmit = async (data: StudentProfileForm) => {
    try {
      setLoading(true)
      setSuccess('')
      setError('')
      setValidationError('')

      const sanitizedLanguages = languages
        .map((language) => language.trim())
        .filter((language) => language.length > 0)

      if (!sanitizedLanguages.length) {
        setValidationError('Please add at least one language you speak.')
        setLoading(false)
        return
      }

      if (!learningPreferences.length) {
        setValidationError('Select at least one learning location preference.')
        setLoading(false)
        return
      }

      if (!profileImage && !settings?.defaultStudentImage) {
        setValidationError('Please upload a profile picture before saving.')
        setLoading(false)
        return
      }

      const response = await api.put('/student/profile', {
        ...data,
        profileImage,
        languagesSpoken: sanitizedLanguages,
        learningLocationPreferences: learningPreferences,
      })

      setSuccess(response.data.message || 'Profile updated successfully')
      setProfileCompleted(Boolean(response.data.profileCompleted))
      setProfileImage(response.data.student?.profileImage || profileImage)
      window.dispatchEvent(new Event('student-profile-updated'))

      if (response.data.profileCompleted) {
        setTimeout(() => {
          navigate('/student/dashboard')
        }, 1600)
      } else {
        setTimeout(() => setSuccess(''), 2500)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const displayProfileImage = useMemo(
    () => resolveImageUrl(profileImage || settings?.defaultStudentImage || ''),
    [profileImage, settings?.defaultStudentImage]
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#012c4f' }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Student Profile</h1>
          <p className="text-white mt-2">
            Share more about yourself so tutors can tailor their sessions to your learning style.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="h-24 w-24 bg-primary-50 border-4 border-white rounded-full overflow-hidden shadow">
                  {displayProfileImage ? (
                    <img src={displayProfileImage} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-3xl text-primary-400">
                      📸
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Profile Photo</h2>
                <p className="text-sm text-slate-500">
                  Upload a friendly, high-quality photo so tutors recognise you quickly.
                </p>
              </div>
            </div>
            <div>
              <label className="btn btn-outline cursor-pointer">
                {uploading ? 'Uploading...' : profileImage ? 'Change Photo' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      handleImageUpload(file)
                    }
                  }}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          {(error || validationError) && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error || validationError}
            </div>
          )}

          {fetchingProfile ? (
            <div className="text-center text-slate-500 py-12">Loading your profile…</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic information</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">First name *</label>
                    <input
                      type="text"
                      className="input"
                      {...register('firstName', { required: 'First name is required' })}
                    />
                    {errors.firstName && <p className="error-text">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="label">Last name *</label>
                    <input
                      type="text"
                      className="input"
                      {...register('lastName', { required: 'Last name is required' })}
                    />
                    {errors.lastName && <p className="error-text">{errors.lastName.message}</p>}
                  </div>
                  {settings?.genderFieldEnabled !== false && (
                    <div>
                      <label className="label">Gender *</label>
                      <select
                        className="input"
                        {...register('gender', { required: 'Please choose a gender' })}
                      >
                        {genderOptions.map((option) => (
                          <option key={option.value || 'placeholder'} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.gender && <p className="error-text">{errors.gender.message}</p>}
                    </div>
                  )}
                  {settings?.gradeFieldEnabled !== false && (
                    <div>
                      <label className="label">Your grade *</label>
                      <select
                        className="input"
                        {...register('grade', { required: 'Select your current grade' })}
                      >
                        <option value="">Choose grade</option>
                        {gradeOptions.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                      {errors.grade && <p className="error-text">{errors.grade.message}</p>}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">About you</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Your tagline *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Aspiring scientist passionate about physics and chemistry"
                      {...register('tagline', { required: 'Tagline is required' })}
                    />
                    {errors.tagline && <p className="error-text">{errors.tagline.message}</p>}
                  </div>
                  <div>
                    <label className="label">City *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter your city"
                      {...register('city', { required: 'City is required' })}
                    />
                    {errors.city && <p className="error-text">{errors.city.message}</p>}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="label">Country *</label>
                    <select
                      className="input"
                      {...register('country', { required: 'Please choose your country' })}
                    >
                      <option value="">Choose country</option>
                      {countryOptions.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {errors.country && <p className="error-text">{errors.country.message}</p>}
                  </div>
                  {settings?.stateFieldEnabled !== false && (
                    <div>
                      <label className="label">State / Province</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Choose state"
                        {...register('state')}
                      />
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="label">Zipcode *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter zipcode"
                      {...register('zipcode', { required: 'Zipcode is required' })}
                    />
                    {errors.zipcode && <p className="error-text">{errors.zipcode.message}</p>}
                  </div>
                </div>
                <div className="mt-6">
                  <label className="label">Your bio *</label>
                  <textarea
                    rows={4}
                    className="input"
                    placeholder="Your bio will appear on your profile page. Use this space to share your learning goals, what excites you, and how you like to learn."
                    {...register('bio', { required: 'Bio is required' })}
                  />
                  {errors.bio && <p className="error-text">{errors.bio.message}</p>}
                </div>
                <div className="mt-6">
                  <label className="label">A brief introduction *</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder="Introduce yourself in a few sentences so tutors can get to know you."
                    {...register('introduction', { required: 'Introduction is required' })}
                  />
                  {errors.introduction && <p className="error-text">{errors.introduction.message}</p>}
                </div>
              </section>

              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Languages</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Select every language you are comfortable learning in.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {LANGUAGE_OPTIONS.map((language) => {
                      const isSelected = languages.includes(language)
                      return (
                        <button
                          key={language}
                          type="button"
                          className={`px-4 py-2 rounded-lg border-2 text-left text-sm transition ${
                            isSelected
                              ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                              : 'border-slate-200 hover:border-primary-200'
                          }`}
                          onClick={() => toggleLanguage(language)}
                        >
                          {language}
                        </button>
                      )
                    })}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Need another language?</p>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder="Add another language"
                        value={customLanguageInput}
                        onChange={(event) => setCustomLanguageInput(event.target.value)}
                      />
                      <button type="button" className="btn btn-outline" onClick={handleAddCustomLanguage}>
                        Add language
                      </button>
                    </div>
                    {customLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {customLanguages.map((language) => (
                          <span
                            key={language}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                          >
                            {language}
                            <button
                              type="button"
                              className="text-xs text-slate-500 hover:text-red-500"
                              onClick={() => removeCustomLanguage(language)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Learning location preference *</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Choose how you prefer to connect with your tutor. Select all that apply.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {learningLocationOptions.map((option) => {
                      const isSelected = learningPreferences.includes(option)
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`px-4 py-2 rounded-full border-2 transition-colors ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                              : 'border-slate-300 text-slate-600 hover:border-primary-200'
                          }`}
                          onClick={() => toggleLearningPreference(option)}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Why complete your profile?</h3>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                  <li>Receive personalised tutor recommendations</li>
                  <li>Help tutors tailor sessions to your goals</li>
                  <li>Unlock the ability to book sessions faster</li>
                </ul>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <button type="submit" disabled={loading} className="btn btn-primary w-full md:w-auto">
                  {loading ? 'Saving...' : 'Save profile'}
                </button>
                <p className="text-sm text-slate-500">
                  Need to finish later? You can always return to update these details.
                </p>
              </div>
            </form>
          )}

          {profileCompleted && !fetchingProfile && (
            <div className="mt-8 bg-primary-50 border border-primary-100 text-primary-700 px-4 py-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold">Profile complete!</h4>
                <p className="text-sm">
                  You’ll be redirected to your dashboard. You can always return here to update your details.
                </p>
              </div>
              <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary">
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default StudentProfile