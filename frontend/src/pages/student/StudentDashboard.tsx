import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, CalendarPlus } from 'lucide-react'
import Navbar from '../../components/Navbar'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import BookTutorModal from '../../components/student/BookTutorModal'

interface Tutor {
  id: string
  firstName: string
  lastName: string
  tagline: string
  hourlyFee: number
  city: string
  state: string
  country: string
  gradesCanTeach: string[]
  profileImage?: string
  subjects: Array<{
    subject: {
      name: string
    }
  }>
  saved?: boolean
}

const StudentDashboard = () => {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [savingTutorId, setSavingTutorId] = useState<string | null>(null)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchTutors()
  }, [])

  const fetchTutors = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/tutors')
      setTutors(response.data.tutors)
    } catch (error) {
      console.error('Error fetching tutors:', error)
      setErrorMessage('Unable to load tutors right now. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTutor = async (tutor: Tutor) => {
    try {
      setSavingTutorId(tutor.id)
      setErrorMessage('')
      if (tutor.saved) {
        await api.delete(`/student/saved-instructors/${tutor.id}`)
      } else {
        await api.post('/student/saved-instructors', { tutorId: tutor.id })
      }
      setTutors((previous) =>
        previous.map((item) => (item.id === tutor.id ? { ...item, saved: !tutor.saved } : item))
      )
      setStatusMessage(
        tutor.saved ? 'Tutor removed from saved instructors.' : 'Tutor added to your saved instructors.'
      )
    } catch (error) {
      console.error('Error updating saved tutor:', error)
      setErrorMessage('Unable to update saved instructors. Please try again.')
    } finally {
      setSavingTutorId(null)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleOpenBooking = (tutor: Tutor) => {
    setSelectedTutor(tutor)
    setIsBookingModalOpen(true)
    setStatusMessage('')
    setErrorMessage('')
  }

  const handleBookingSuccess = () => {
    setIsBookingModalOpen(false)
    setSelectedTutor(null)
    setStatusMessage('Hire request sent! You can review it in “My Hires & Sessions”.')
    setTimeout(() => setStatusMessage(''), 4000)
  }

  const filteredTutors = tutors.filter((tutor) => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${tutor.firstName} ${tutor.lastName}`.toLowerCase()
    const subjects = tutor.subjects.map((s) => s.subject.name.toLowerCase()).join(' ')
    const location = `${tutor.city ?? ''} ${tutor.state ?? ''} ${tutor.country ?? ''}`.toLowerCase()

    return (
      fullName.includes(searchLower) ||
      subjects.includes(searchLower) ||
      location.includes(searchLower) ||
      tutor.tagline?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Discover Your Perfect Tutor</h1>
            <p className="text-slate-600 mt-2">
              Search by name, subject, or location to find tutors aligned with your learning goals.
            </p>
          </div>
          <Link to="/student/profile" className="btn btn-outline">
            Update my learner profile
          </Link>
        </div>

        <div className="mb-4">
          {statusMessage && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mb-3">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-3">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="mb-6 bg-white rounded-2xl shadow px-4 py-3 flex items-center gap-3">
          <span className="text-slate-400 text-lg">🔎</span>
          <input
            type="text"
            placeholder="Search by name, subject, or city..."
            className="flex-1 outline-none text-slate-700"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">Loading tutors…</div>
        ) : filteredTutors.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-12 text-center">
            <div className="text-6xl mb-3">🤔</div>
            <h3 className="text-xl font-semibold text-slate-900">No tutors found</h3>
            <p className="text-slate-500 mt-2">
              {searchTerm ? 'Try broadening your search terms.' : 'Check back soon for new tutors joining JTutors.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => {
              const heroImage = resolveImageUrl(tutor.profileImage)
              const initials = `${tutor.firstName?.charAt(0) ?? ''}${tutor.lastName?.charAt(0) ?? ''}` || 'JT'
              const isSaving = savingTutorId === tutor.id

              return (
                <div
                  key={tutor.id}
                  className="bg-white rounded-3xl shadow hover:shadow-xl transition-shadow overflow-hidden flex flex-col"
                >
                  <div className="relative">
                    <div className="h-40 bg-gradient-to-r from-primary-200 via-indigo-100 to-slate-100">
                      {heroImage ? (
                        <img
                          src={heroImage}
                          alt={`${tutor.firstName} ${tutor.lastName}`}
                          className="h-full w-full object-cover opacity-90"
                        />
                      ) : null}
                    </div>
                    <div className="absolute top-4 right-4">
                      <button
                        type="button"
                        onClick={() => handleSaveTutor(tutor)}
                        disabled={isSaving}
                        className={`rounded-full p-2 shadow bg-white transition-colors ${
                          tutor.saved ? 'text-primary-600' : 'text-slate-500 hover:text-primary-500'
                        }`}
                        aria-label={tutor.saved ? 'Remove from saved instructors' : 'Save this tutor'}
                      >
                        {tutor.saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                      </button>
                    </div>
                    <div className="absolute -bottom-10 left-6 h-20 w-20 rounded-2xl border-4 border-white shadow bg-white overflow-hidden flex items-center justify-center text-2xl text-primary-600 font-semibold">
                      {heroImage ? (
                        <img src={heroImage} alt={`${tutor.firstName}`} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>
                  <div className="pt-12 px-6 pb-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {tutor.firstName} {tutor.lastName}
                        </h3>
                        <p className="text-xs uppercase tracking-wide text-slate-500 mt-1">
                          {tutor.city ? `${tutor.city}, ${tutor.state || tutor.country}` : tutor.country}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">${tutor.hourlyFee}</div>
                        <div className="text-xs text-slate-500">per hour</div>
                      </div>
                    </div>

                    {tutor.tagline && (
                      <p className="text-sm text-slate-600 mt-3 line-clamp-2">{tutor.tagline}</p>
                    )}

                    {tutor.subjects.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Subjects</p>
                        <div className="flex flex-wrap gap-2">
                          {tutor.subjects.slice(0, 3).map((subjectItem, index) => (
                            <span
                              key={`${subjectItem.subject.name}-${index}`}
                              className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium"
                            >
                              {subjectItem.subject.name}
                            </span>
                          ))}
                          {tutor.subjects.length > 3 && (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                              +{tutor.subjects.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {tutor.gradesCanTeach && tutor.gradesCanTeach.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Grades</p>
                        <p className="text-sm text-slate-600">
                          {tutor.gradesCanTeach.slice(0, 3).join(', ')}
                          {tutor.gradesCanTeach.length > 3 && ` +${tutor.gradesCanTeach.length - 3} more`}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto flex flex-col gap-3 pt-6">
                      <button
                        type="button"
                        className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
                        onClick={() => handleOpenBooking(tutor)}
                      >
                        <CalendarPlus size={18} />
                        Hire this tutor
                      </button>
                      <Link
                        to={`/student/tutor/${tutor.id}`}
                        className="btn btn-outline w-full inline-flex items-center justify-center"
                      >
                        View tutor profile
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BookTutorModal
        tutor={selectedTutor}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false)
          setSelectedTutor(null)
        }}
        onBooked={handleBookingSuccess}
        onError={(message) => setErrorMessage(message)}
      />
    </div>
  )
}

export default StudentDashboard


