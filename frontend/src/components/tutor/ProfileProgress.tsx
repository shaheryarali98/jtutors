import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

const ProfileProgress = () => {
  const [completion, setCompletion] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCompletion = async () => {
      try {
        const response = await api.get('/tutor/profile/completion')
        const value = response.data.profileCompletion
        setCompletion(value)
        setShowSuccess(value === 100)
      } catch (error) {
        console.error('Error fetching profile completion:', error)
      }
    }

    fetchCompletion()
    const handleUpdate = () => fetchCompletion()
    window.addEventListener('tutor-profile-updated', handleUpdate)

    return () => {
      window.removeEventListener('tutor-profile-updated', handleUpdate)
    }
  }, [navigate])

  return (
    <div className="bg-white rounded-lg p-4 shadow space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Profile Completion</span>
        <span className="text-sm font-bold text-primary-600">{completion}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className="bg-primary-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${completion}%` }}
        />
      </div>
      {showSuccess && (
        <div className="bg-primary-50 border border-primary-100 text-primary-700 px-3 py-2 rounded-lg flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Profile complete! Your profile is now visible to students.</span>
          <button
            className="text-sm font-semibold underline"
            onClick={() => navigate('/tutor/dashboard')}
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

export default ProfileProgress

