import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookmarkX, CalendarPlus } from 'lucide-react'
import Navbar from '../../components/Navbar'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import BookTutorModal from '../../components/student/BookTutorModal'

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
  const [selectedTutor, setSelectedTutor] = useState<SavedTutorEntry['tutor'] | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  useEffect(() => {
    fetchSavedTutors()
  }, [])

  const fetchSavedTutors = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/saved-instructors')
      setSavedTutors(response.data.savedTutors)
    } catch (err) {
      console.error('Error fetching saved instructors:', err)
      setError('Unable to load your saved instructors right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (tutorId: string) => {
    try {
      await api.delete(`/student/saved-instructors/${tutorId}`)
      setSavedTutors((previous) => previous.filter((entry) => entry.tutorId !== tutorId))
      setStatusMessage('Instructor removed from your saved list.')
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (err) {
      console.error('Error removing saved instructor:', err)
      setError('Failed to remove instructor. Please try again.')
    }
  }

  const openBookingModal = (tutor: SavedTutorEntry['tutor']) => {
    setSelectedTutor(tutor)
    setBookingModalOpen(true)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Saved Instructors</h1>
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
            Loading saved instructors…
          </div>
        ) : savedTutors.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-12 text-center">
            <div className="text-6xl mb-3">📚</div>
            <h3 className="text-xl font-semibold text-slate-900">No saved instructors yet</h3>
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

                  <div className="mt-auto pt-6 flex flex-col md:flex-row gap-3">
                    <button
                      type="button"
                      className="btn btn-primary inline-flex items-center justify-center gap-2 flex-1"
                      onClick={() => openBookingModal(tutor)}
                    >
                      <CalendarPlus size={18} />
                      Hire for a session
                    </button>
                    <Link
                      to={`/student/tutor/${tutor.id}`}
                      className="btn btn-outline inline-flex items-center justify-center flex-1"
                    >
                      View profile
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BookTutorModal
        tutor={
          selectedTutor && {
            id: selectedTutor.id,
            firstName: selectedTutor.firstName,
            lastName: selectedTutor.lastName,
            hourlyFee: selectedTutor.hourlyFee,
            profileImage: selectedTutor.profileImage,
            city: selectedTutor.city,
            state: selectedTutor.state,
            country: selectedTutor.country,
            tagline: selectedTutor.tagline,
          }
        }
        isOpen={bookingModalOpen && !!selectedTutor}
        onClose={() => {
          setBookingModalOpen(false)
          setSelectedTutor(null)
        }}
        onBooked={() => {
          setBookingModalOpen(false)
          setSelectedTutor(null)
          setStatusMessage('Hire request sent! You can review it in “My Bookings”.')
          setTimeout(() => setStatusMessage(''), 4000)
        }}
        onError={(message) => setError(message)}
      />
    </div>
  )
}

export default SavedInstructors


