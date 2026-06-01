import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bookmark, BookmarkCheck, CalendarPlus, MapPin, Shield, MessageCircle } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import BookTutorModal from '../../components/student/BookTutorModal'
import { useAuthStore } from '../../store/authStore'

interface TutorDetail {
  id: string
  firstName: string
  lastName: string
  tagline?: string
  bio?: string
  hourlyFee?: number
  country?: string
  state?: string
  city?: string
  profileImage?: string
  coverImage?: string
  gradesCanTeach?: string[]
  languagesSpoken?: string[]
  experiences?: Array<{
    id: string
    jobTitle: string
    company: string
    location: string
    startDate: string
    endDate?: string | null
    isCurrent: boolean
    teachingMode: string
    description?: string | null
  }>
  educations?: Array<{
    id: string
    degreeTitle: string
    university: string
    location: string
    startDate: string
    endDate?: string | null
    isOngoing: boolean
  }>
  subjects: Array<{
    subject: {
      name: string
    }
  }>
  saved?: boolean
}

const TutorDetailPage = () => {
  const { user } = useAuthStore()
  const isStudent = user?.role === 'STUDENT'
  const { tutorId } = useParams()
  const navigate = useNavigate()
  const [tutor, setTutor] = useState<TutorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchTutor = async () => {
    if (!tutorId) return
    try {
      setLoading(true)
      const endpoint = isStudent ? `/student/tutors/${tutorId}` : `/public/tutors/${tutorId}`
      const response = await api.get(endpoint)
      setTutor(response.data.tutor)
    } catch (err) {
      console.error('Error fetching tutor details:', err)
      setError('Unable to load tutor details right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTutor()
  }, [tutorId, isStudent])

  const handleToggleSaved = async () => {
    if (!isStudent) {
      navigate('/login')
      return
    }

    if (!tutor) return
    try {
      setSaving(true)
      if (tutor.saved) {
        await api.delete(`/student/saved-instructors/${tutor.id}`)
      } else {
        await api.post('/student/saved-instructors', { tutorId: tutor.id })
      }
      setTutor((prev) => (prev ? { ...prev, saved: !prev.saved } : prev))
    } catch (err) {
      console.error('Error updating saved tutor:', err)
      setError('Unable to update saved status. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center text-slate-500">
          Loading tutor profile…
        </div>
      </div>
    )
  }

  if (!tutor || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <div className="bg-white rounded-3xl shadow p-12">
            <div className="text-6xl mb-3">😕</div>
            <h3 className="text-xl font-semibold text-slate-900">Tutor not available</h3>
            <p className="text-slate-500 mt-2">
              {error || 'We could not find details for this tutor. They might have been removed from the platform.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const profileImage = resolveImageUrl(tutor.profileImage)
  const coverImage = resolveImageUrl(tutor.coverImage)
  const tutorDisplayName = `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() || 'Tutor Profile'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <a href="/browse-tutors" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} />
          Back to browse
        </a>

        <div className="bg-white rounded-3xl shadow overflow-hidden">
          {/* Cover Banner */}
          <div className="h-48 md:h-56 relative overflow-hidden bg-gradient-to-r from-[#012c54] via-indigo-700 to-slate-700">
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="h-full w-full object-cover" />
            ) : null}
          </div>

          {/* Content Section */}
          <div className="px-6 md:px-10 py-8 md:py-10">
            {/* Avatar - sits cleanly below banner */}
            <div className="mb-6">
              <div className="h-32 w-32 rounded-3xl border-4 border-slate-200 shadow-lg bg-white overflow-hidden flex items-center justify-center text-2xl font-semibold text-primary-600 flex-shrink-0">
                {profileImage ? (
                  <img src={profileImage} alt={tutorDisplayName} className="h-full w-full object-cover" />
                ) : (
                  `${tutor.firstName?.charAt(0) || ''}${tutor.lastName?.charAt(0) || ''}`
                )}
              </div>
            </div>

            {/* Header - Name and quick actions */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">{tutorDisplayName}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-3">
                  {(tutor.city || tutor.country) && (
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={18} className="text-slate-400" />
                      <span>{tutor.city ? `${tutor.city}, ${tutor.state || tutor.country}` : tutor.country}</span>
                    </span>
                  )}
                  {tutor.languagesSpoken?.length ? (
                    <span className="inline-flex items-center gap-2">
                      🌐
                      <span>{tutor.languagesSpoken.join(', ')}</span>
                    </span>
                  ) : null}
                </div>
                {tutor.tagline && <p className="text-slate-600 text-lg leading-relaxed">{tutor.tagline}</p>}
              </div>

              {/* Sidebar: Price and buttons */}
              <div className="flex flex-col gap-4 lg:sticky lg:top-8">
                {tutor.hourlyFee ? (
                  <div className="bg-gradient-to-br from-[#f5a11a]/10 to-[#f5a11a]/5 border border-[#f5a11a]/30 rounded-2xl px-6 py-5 text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hourly rate</p>
                    <p className="text-4xl font-bold text-[#012c54] mt-2">${tutor.hourlyFee.toFixed(2)}</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="btn btn-primary inline-flex items-center justify-center gap-2 py-3"
                  onClick={() => (isStudent ? setBookingModalOpen(true) : navigate('/login'))}
                >
                  <CalendarPlus size={20} />
                  {isStudent ? 'Hire this tutor' : 'Login to hire'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary inline-flex items-center justify-center gap-2"
                  onClick={async () => {
                    if (!isStudent) { navigate('/login'); return }
                    try {
                      await api.post('/messages/conversations', { tutorId: tutor!.id })
                      navigate('/student/messages')
                    } catch (err) { console.error('Error starting conversation:', err) }
                  }}
                >
                  <MessageCircle size={20} />
                  Message
                </button>
                <button
                  type="button"
                  className="btn btn-secondary inline-flex items-center justify-center gap-2"
                  onClick={handleToggleSaved}
                  disabled={saving}
                >
                  {tutor.saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                  {tutor.saved ? 'Saved' : isStudent ? 'Save tutor' : 'Login to save'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {tutor.bio && (
          <section className="bg-white rounded-3xl shadow p-6 md:p-8 space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">About {tutor.firstName}</h2>
            <p className="text-slate-600 leading-relaxed">{tutor.bio}</p>
          </section>
        )}

        {tutor.subjects.length > 0 && (
          <section className="bg-white rounded-3xl shadow p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Subjects offered</h2>
            <div className="flex flex-wrap gap-3">
              {tutor.subjects.map((subjectItem, index) => (
                <span
                  key={`${subjectItem.subject.name}-${index}`}
                  className="px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                >
                  {subjectItem.subject.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {tutor.gradesCanTeach && tutor.gradesCanTeach.length > 0 && (
          <section className="bg-white rounded-3xl shadow p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Grades supported</h2>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              {tutor.gradesCanTeach.map((grade) => (
                <span key={grade} className="px-3 py-1 bg-slate-100 rounded-full">
                  {grade}
                </span>
              ))}
            </div>
          </section>
        )}

        {tutor.experiences && tutor.experiences.length > 0 && (
          <section className="bg-white rounded-3xl shadow p-6 md:p-8 space-y-5">
            <h2 className="text-xl font-semibold text-slate-900">Experience</h2>
            {tutor.experiences.map((experience) => (
              <div key={experience.id} className="border border-slate-100 rounded-2xl px-5 py-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{experience.jobTitle}</h3>
                    <p className="text-sm text-slate-500">
                      {experience.company} · {experience.location}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(experience.startDate).getFullYear()} –{' '}
                    {experience.isCurrent || !experience.endDate
                      ? 'Present'
                      : new Date(experience.endDate).getFullYear()}
                  </p>
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mt-2">
                  Teaching mode: {experience.teachingMode}
                </p>
                {experience.description && (
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">{experience.description}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {tutor.educations && tutor.educations.length > 0 && (
          <section className="bg-white rounded-3xl shadow p-6 md:p-8 space-y-5">
            <h2 className="text-xl font-semibold text-slate-900">Education</h2>
            {tutor.educations.map((education) => (
              <div key={education.id} className="border border-slate-100 rounded-2xl px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">{education.degreeTitle}</h3>
                <p className="text-sm text-slate-500">
                  {education.university} · {education.location}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {new Date(education.startDate).getFullYear()} –{' '}
                  {education.isOngoing || !education.endDate
                    ? 'Present'
                    : new Date(education.endDate).getFullYear()}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>

      <BookTutorModal
        tutor={
          tutor && {
            id: tutor.id,
            firstName: tutor.firstName,
            lastName: tutor.lastName,
            hourlyFee: tutor.hourlyFee || 0,
            profileImage: tutor.profileImage,
            city: tutor.city,
            state: tutor.state,
            country: tutor.country,
            tagline: tutor.tagline,
          }
        }
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onBooked={() => setBookingModalOpen(false)}
        onError={(message) => setError(message)}
      />
      <Footer />
    </div>
  )
}

export default TutorDetailPage


