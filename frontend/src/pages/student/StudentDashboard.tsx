import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bookmark,
  BookmarkCheck,
  CalendarPlus,
  MessageCircle,
  BookOpen,
  Clock,
  Users,
  ChevronRight,
  Search,
  Sparkles,
  GraduationCap,
  Star,
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import { usePlatformSettings } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
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
  subjects: Array<{ subject: { name: string } }>
  saved?: boolean
}

interface StudentStats {
  firstName: string | null
  savedTutors: number
  bookings: number
  totalHours: number
}

const StudentDashboard = () => {
  const { user: _user } = useAuthStore()
  const navigate = useNavigate()
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [savingTutorId, setSavingTutorId] = useState<string | null>(null)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [stats, setStats] = useState<StudentStats>({ firstName: null, savedTutors: 0, bookings: 0, totalHours: 0 })
  const [unreadMessages, setUnreadMessages] = useState(0)
  const { settings, fetchSettings } = usePlatformSettings()

  useEffect(() => {
    fetchSettings()
    fetchTutors()
    fetchStats()
    fetchUnread()
  }, [fetchSettings])

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

  const fetchStats = async () => {
    try {
      const [profileRes, savedRes, bookingsRes, hoursRes] = await Promise.allSettled([
        api.get('/student/profile'),
        api.get('/student/saved-instructors'),
        api.get('/student/bookings'),
        api.get('/student/hour-log'),
      ])
      const firstName = profileRes.status === 'fulfilled' ? profileRes.value.data.student?.firstName : null
      const savedCount = savedRes.status === 'fulfilled' ? (savedRes.value.data.savedTutors?.length ?? 0) : 0
      const bookingsCount = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data.bookings?.length ?? 0) : 0
      const totalHours = hoursRes.status === 'fulfilled'
        ? (hoursRes.value.data.sessions ?? []).reduce((acc: number, s: any) => acc + (s.actualHoursTaught || s.scheduledHours || 0), 0)
        : 0
      setStats({ firstName, savedTutors: savedCount, bookings: bookingsCount, totalHours: Math.round(totalHours * 10) / 10 })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchUnread = async () => {
    try {
      const res = await api.get('/messages/unread-count')
      setUnreadMessages(res.data.unreadCount ?? 0)
    } catch (_) {}
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
      setStats((prev) => ({ ...prev, savedTutors: tutor.saved ? prev.savedTutors - 1 : prev.savedTutors + 1 }))
      setStatusMessage(tutor.saved ? 'Removed from saved tutors.' : 'Saved to your instructors list.')
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
    setStats((prev) => ({ ...prev, bookings: prev.bookings + 1 }))
    setStatusMessage('Booking sent! Check "My Bookings" to track it.')
    setTimeout(() => setStatusMessage(''), 4000)
  }

  const handleMessageTutor = async (tutorId: string) => {
    try {
      await api.post('/messages/conversations', { tutorId })
      navigate('/student/messages')
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
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

  const greeting = stats.firstName ? `Welcome back, ${stats.firstName}!` : 'Welcome back!'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero Banner */}
        <div
          className="rounded-3xl p-8 mb-8 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #012c54 0%, #014a8f 60%, #0162ba 100%)' }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-yellow-300 text-sm font-semibold uppercase tracking-wide">Student Dashboard</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{greeting}</h1>
            <p className="text-sky-200 text-base mb-6 max-w-xl">
              Find expert tutors, book sessions, and track your learning journey all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/student/browse-tutors"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f5a11a] text-white font-semibold rounded-full text-sm hover:bg-yellow-500 transition-colors"
              >
                <Search className="w-4 h-4" /> Browse Tutors
              </Link>
              <Link
                to="/student/tutor-requests"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 text-white font-semibold rounded-full text-sm hover:bg-white/10 transition-colors"
              >
                <GraduationCap className="w-4 h-4" /> Post a Request
              </Link>
            </div>
          </div>
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -right-8 -bottom-20 w-48 h-48 bg-white/5 rounded-full" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to="/student/saved-instructors" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.savedTutors}</div>
            <div className="text-sm text-slate-500 mt-0.5 flex items-center justify-between">
              Saved Tutors
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          <Link to="/student/bookings" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.bookings}</div>
            <div className="text-sm text-slate-500 mt-0.5 flex items-center justify-between">
              Bookings
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          <Link to="/student/hour-log" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalHours}</div>
            <div className="text-sm text-slate-500 mt-0.5 flex items-center justify-between">
              Hours Tutored
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          <Link to="/student/messages" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{unreadMessages > 0 ? `${unreadMessages}` : '0'}</div>
            <div className="text-sm text-slate-500 mt-0.5 flex items-center justify-between">
              {unreadMessages > 0 ? 'Unread Messages' : 'Messages'}
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Link to="/student/bookings" className="flex items-center gap-2.5 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-sm font-medium text-slate-700 hover:shadow-md hover:text-[#012c54] transition-all">
            <BookOpen className="w-4 h-4 text-indigo-500" /> My Bookings
          </Link>
          <Link to="/student/saved-instructors" className="flex items-center gap-2.5 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-sm font-medium text-slate-700 hover:shadow-md hover:text-[#012c54] transition-all">
            <Star className="w-4 h-4 text-yellow-500" /> Saved Tutors
          </Link>
          <Link to="/student/messages" className="flex items-center gap-2.5 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-sm font-medium text-slate-700 hover:shadow-md hover:text-[#012c54] transition-all">
            <MessageCircle className="w-4 h-4 text-sky-500" /> Messages
          </Link>
          <Link to="/student/profile" className="flex items-center gap-2.5 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-sm font-medium text-slate-700 hover:shadow-md hover:text-[#012c54] transition-all">
            <GraduationCap className="w-4 h-4 text-emerald-500" /> My Profile
          </Link>
        </div>

        {/* Status messages */}
        {statusMessage && (
          <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl mb-5 text-sm">
            {statusMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Tutors Section */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-900">Available Tutors</h2>
          <Link to="/student/browse-tutors" className="text-sm font-medium text-[#012c54] hover:underline flex items-center gap-1">
            Advanced search <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Search bar */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, subject, or city..."
            className="flex-1 outline-none text-slate-700 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-36 bg-slate-100" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-10 bg-slate-100 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-14 text-center">
            <GraduationCap className="w-14 h-14 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-800">No tutors found</h3>
            <p className="text-slate-500 mt-2 text-sm">
              {searchTerm ? 'Try different search terms.' : 'Check back soon for new tutors.'}
            </p>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="mt-4 text-sm text-[#012c54] font-medium hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => {
              const heroImage = resolveImageUrl(tutor.profileImage || settings?.defaultTutorImage || '')
              const initials = `${tutor.firstName?.charAt(0) ?? ''}${tutor.lastName?.charAt(0) ?? ''}` || 'JT'
              const isSaving = savingTutorId === tutor.id
              const location = [tutor.city, tutor.state || tutor.country].filter(Boolean).join(', ')

              return (
                <div key={tutor.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all overflow-hidden flex flex-col">
                  {/* Cover + avatar */}
                  <div className="relative">
                    <div className="h-36 bg-gradient-to-r from-sky-100 via-indigo-50 to-slate-100">
                      {heroImage && (
                        <img src={heroImage} alt="" className="h-full w-full object-cover opacity-80" />
                      )}
                    </div>
                    <button
                      onClick={() => handleSaveTutor(tutor)}
                      disabled={isSaving}
                      className={`absolute top-3 right-3 rounded-full p-2 shadow bg-white transition-colors ${tutor.saved ? 'text-[#f5a11a]' : 'text-slate-400 hover:text-[#f5a11a]'}`}
                    >
                      {tutor.saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                    </button>
                    <div className="absolute -bottom-8 left-5 h-16 w-16 rounded-2xl border-4 border-white shadow bg-white overflow-hidden flex items-center justify-center text-xl font-bold text-[#012c54]">
                      {heroImage ? (
                        <img src={heroImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-10 px-5 pb-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">
                          {tutor.firstName} {tutor.lastName}
                        </h3>
                        {location && <p className="text-xs text-slate-400 mt-0.5">{location}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-bold text-[#012c54]">${tutor.hourlyFee}</div>
                        <div className="text-xs text-slate-400">/hr</div>
                      </div>
                    </div>

                    {tutor.tagline && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-snug">{tutor.tagline}</p>
                    )}

                    {tutor.subjects.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tutor.subjects.slice(0, 3).map((s, i) => (
                          <span key={i} className="px-2.5 py-0.5 bg-sky-50 text-sky-700 rounded-full text-xs font-medium">
                            {s.subject.name}
                          </span>
                        ))}
                        {tutor.subjects.length > 3 && (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">
                            +{tutor.subjects.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {tutor.gradesCanTeach?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tutor.gradesCanTeach.slice(0, 3).map((g, i) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenBooking(tutor)}
                        className="flex items-center justify-center gap-1.5 py-2.5 bg-[#012c54] text-white text-sm font-semibold rounded-xl hover:bg-[#012c54]/90 transition-colors"
                      >
                        <CalendarPlus size={15} /> Book
                      </button>
                      <button
                        onClick={() => handleMessageTutor(tutor.id)}
                        className="flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <MessageCircle size={15} /> Message
                      </button>
                    </div>
                    <Link
                      to={`/student/tutor/${tutor.id}`}
                      className="mt-2 flex items-center justify-center py-2 text-xs text-slate-400 hover:text-[#012c54] transition-colors"
                    >
                      View full profile <ChevronRight className="w-3 h-3 ml-1" />
                    </Link>
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
        onClose={() => { setIsBookingModalOpen(false); setSelectedTutor(null) }}
        onBooked={handleBookingSuccess}
        onError={(message) => setErrorMessage(message)}
      />
      <Footer />
    </div>
  )
}

export default StudentDashboard