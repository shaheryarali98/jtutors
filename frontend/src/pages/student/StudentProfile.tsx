import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../lib/api'

interface StudentProfileForm {
  firstName: string
  lastName: string
}

const StudentProfile = () => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<StudentProfileForm>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [profileCompleted, setProfileCompleted] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me')
        const student = response.data.student
        if (student) {
          setValue('firstName', student.firstName || '')
          setValue('lastName', student.lastName || '')
          setProfileImage(student.profileImage || '')
          setProfileCompleted(Boolean(student.profileCompleted))
        }
      } catch (err) {
        console.error('Error loading student profile:', err)
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
          'Content-Type': 'multipart/form-data'
        }
      })
      setProfileImage(response.data.url)
      setSuccess('Profile photo uploaded successfully')
      setError('')
      window.dispatchEvent(new Event('student-profile-updated'))
      setTimeout(() => setSuccess(''), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: StudentProfileForm) => {
    try {
      setLoading(true)
      setSuccess('')
      setError('')
      const response = await api.put('/student/profile', {
        ...data,
        profileImage
      })

      setSuccess(response.data.message || 'Profile updated successfully')
      setProfileCompleted(Boolean(response.data.profileCompleted))
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Student Profile</h1>
          <p className="text-slate-600 mt-2">Tell us a little about you so tutors can tailor the experience.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="h-24 w-24 bg-primary-50 border-4 border-white rounded-full overflow-hidden shadow">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
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
                  Upload a friendly, high-quality photo so tutors recognize you quickly.
                </p>
              </div>
            </div>
            <div>
              <label className="btn btn-outline cursor-pointer">
                {uploading ? 'Uploading...' : 'Upload Photo'}
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

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
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

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Why complete your profile?</h3>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>Receive personalised tutor recommendations</li>
                <li>Help tutors tailor sessions to your goals</li>
                <li>Unlock the ability to book sessions faster</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full md:w-auto"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          {profileCompleted && (
            <div className="mt-8 bg-primary-50 border border-primary-100 text-primary-700 px-4 py-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold">Profile complete!</h4>
                <p className="text-sm">You’ll be redirected to your dashboard. You can always return here to update your details.</p>
              </div>
              <button
                onClick={() => navigate('/student/dashboard')}
                className="btn btn-primary"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentProfile

