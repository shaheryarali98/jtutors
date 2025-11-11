import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../lib/api'

const TutorDashboard = () => {
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompletion = async () => {
      try {
        const response = await api.get('/tutor/profile/completion')
        setProfileCompletion(response.data.profileCompletion)
      } catch (error) {
        console.error('Error fetching profile completion:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCompletion()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Tutor Dashboard</h1>

        {!loading && profileCompletion < 100 && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Complete Your Profile</h2>
                <p className="text-gray-600">
                  Your profile is {profileCompletion}% complete. Finish setting up to start receiving students!
                </p>
              </div>
              <Link to="/tutor/profile" className="btn btn-primary">
                Complete Profile
              </Link>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-primary-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2">My Sessions</h3>
            <p className="text-gray-600 mb-4">View and manage your upcoming tutoring sessions</p>
            <Link to="/tutor/sessions" className="text-primary-600 hover:text-primary-700 font-medium">
              View Sessions →
            </Link>
          </div>

          <div className="card">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-xl font-bold mb-2">My Profile</h3>
            <p className="text-gray-600 mb-4">Update your personal information and qualifications</p>
            <Link to="/tutor/profile" className="text-primary-600 hover:text-primary-700 font-medium">
              Edit Profile →
            </Link>
          </div>

          <div className="card">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-2">Earnings</h3>
            <p className="text-gray-600 mb-4">Track your earnings and payment history</p>
            <Link to="/tutor/earnings" className="text-primary-600 hover:text-primary-700 font-medium">
              View Earnings →
            </Link>
          </div>
        </div>

        <div className="mt-8 card">
          <h2 className="text-xl font-bold mb-4">Getting Started</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className={`mr-3 ${profileCompletion >= 12 ? 'text-green-500' : 'text-gray-400'}`}>
                {profileCompletion >= 12 ? '✓' : '○'}
              </span>
              <span className="text-gray-700">Complete personal information</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 ${profileCompletion >= 25 ? 'text-green-500' : 'text-gray-400'}`}>
                {profileCompletion >= 25 ? '✓' : '○'}
              </span>
              <span className="text-gray-700">Add your teaching experience</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 ${profileCompletion >= 37 ? 'text-green-500' : 'text-gray-400'}`}>
                {profileCompletion >= 37 ? '✓' : '○'}
              </span>
              <span className="text-gray-700">Add your education background</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 ${profileCompletion >= 50 ? 'text-green-500' : 'text-gray-400'}`}>
                {profileCompletion >= 50 ? '✓' : '○'}
              </span>
              <span className="text-gray-700">Select subjects you can teach</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 ${profileCompletion >= 62 ? 'text-green-500' : 'text-gray-400'}`}>
                {profileCompletion >= 62 ? '✓' : '○'}
              </span>
              <span className="text-gray-700">Set your availability</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 ${profileCompletion >= 75 ? 'text-green-500' : 'text-gray-400'}`}>
                {profileCompletion >= 75 ? '✓' : '○'}
              </span>
              <span className="text-gray-700">Connect your payment method</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 ${profileCompletion >= 87 ? 'text-green-500' : 'text-gray-400'}`}>
                {profileCompletion >= 87 ? '✓' : '○'}
              </span>
              <span className="text-gray-700">Complete background check</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 ${profileCompletion === 100 ? 'text-green-500' : 'text-gray-400'}`}>
                {profileCompletion === 100 ? '✓' : '○'}
              </span>
              <span className="text-gray-700">Upload profile photo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TutorDashboard

