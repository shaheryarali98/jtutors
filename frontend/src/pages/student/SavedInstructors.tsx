import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookmarkX } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'

interface SavedTutorEntry {
  id: string
  tutorId: string
  savedAt: string
  tutor: {
    id: string
    firstName: string
    lastName: string
    tagline?: string
    hourlyFee: number
    city?: string
    state?: string
    country?: string
    profileImage?: string
    subjects: Array<{
      subject: {
        name: string
      }
    }>
    gradesCanTeach?: string[]
  }
}

const SavedInstructors = () => {
  const [savedTutors, setSavedTutors] = useState<SavedTutorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    fetchSavedTutors()
  }, [])

  const fetchSavedTutors = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/saved-instructors')
      setSavedTutors(response.data.savedTutors)
    } catch (err) {
      console.error('Error fetching saved tutors:', err)
      setError('Unable to load your saved tutors right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (tutorId: string) => {
    try {
      await api.delete(`/student/saved-instructors/${tutorId}`)
      setSavedTutors((previous) => previous.filter((entry) => entry.tutorId !== tutorId))
      setStatusMessage('Tutor removed from your saved list.')
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (err) {
      console.error('Error removing saved tutor:', err)
      setError('Failed to remove tutor. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Saved Tutors</h1>
          <p className="text-slate-600 mt-2">
            Bookmark tutors you like and book them whenever you’re ready for a session.
          </p>
        </div>

        {statusMessage && (
          <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">
            Loading saved tutors…
          </div>
        ) : savedTutors.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-12 text-center">
            <div className="text-6xl mb-3">📚</div>
            <h3 className="text-xl font-semibold text-slate-900">No saved tutors yet</h3>
            <p className="text-slate-500 mt-2">
              Browse tutors on the dashboard and tap the bookmark icon to save your favourites.
            </p>
            <Link to="/student/dashboard" className="btn btn-primary mt-6 inline-flex items-center justify-center">
              Discover tutors
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {savedTutors.map((entry) => {
              const tutor = entry.tutor
              const avatar = resolveImageUrl(tutor.profileImage)
              return (
                <div key={entry.id} className="bg-white rounded-3xl shadow p-6 flex flex-col">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center text-lg font-semibold text-primary-600">
                      {avatar ? (
                        <img src={avatar} alt={`${tutor.firstName}`} className="h-full w-full object-cover" />
                      ) : (
                        `${tutor.firstName.charAt(0)}${tutor.lastName.charAt(0)}`
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900">
                            {tutor.firstName} {tutor.lastName}
                          </h2>
                          <p className="text-sm text-slate-500">
                            {tutor.city ? `${tutor.city}, ${tutor.state || tutor.country}` : tutor.country}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(tutor.id)}
                          className="btn btn-secondary inline-flex items-center gap-2"
                        >
                          <BookmarkX size={16} />
                          Remove
                        </button>
                      </div>
                      <p className="text-sm text-primary-600 font-medium mt-2">${tutor.hourlyFee.toFixed(2)} per hour</p>
                      {tutor.tagline && <p className="text-sm text-slate-600 mt-2">{tutor.tagline}</p>}
                    </div>
                  </div>

                  {tutor.subjects.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Subjects</p>
                      <div className="flex flex-wrap gap-2">
                        {tutor.subjects.slice(0, 4).map((subjectItem, index) => (
                          <span
                            key={`${subjectItem.subject.name}-${index}`}
                            className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium"
                          >
                            {subjectItem.subject.name}
                          </span>
                        ))}
                        {tutor.subjects.length > 4 && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                            +{tutor.subjects.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-6">
                    <Link
                      to={`/tutors/${tutor.id}`}
                      className="flex w-full items-center justify-center rounded-xl bg-[#f5a11a] py-3 font-bold text-white shadow-md transition-colors hover:bg-[#c48115] hover:shadow-lg"
                    >
                      View Full Profile
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default SavedInstructors


