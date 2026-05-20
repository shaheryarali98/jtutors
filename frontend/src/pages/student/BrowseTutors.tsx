import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bookmark,
  BookmarkCheck,
  CalendarPlus,
  Search,
  MapPin,
  DollarSign,
  GraduationCap,
  Filter,
  X,
  Users,
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import BookTutorModal from '../../components/student/BookTutorModal'
import { useAuthStore } from '../../store/authStore'

interface Tutor {
  id: string
  firstName: string
  lastName: string
  tagline?: string
  hourlyFee: number
  city?: string
  state?: string
  country?: string
  gradesCanTeach?: string[]
  profileImage?: string
  coverImage?: string
  subjects: Array<{
    subject: {
      name: string
    }
  }>
  saved?: boolean
}

const BrowseTutors = () => {
  const { user } = useAuthStore()
  const isStudent = user?.role === 'STUDENT'
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [minFee, setMinFee] = useState('')
  const [maxFee, setMaxFee] = useState('')
  const [location, setLocation] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [savingTutorId, setSavingTutorId] = useState<string | null>(null)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    // Load subjects asynchronously without blocking the page
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      setSubjectsLoading(true)
      const response = await api.get('/subjects')
      // Backend already returns subcategories separated - use them directly
      const subcategories = response.data.subcategories || []
      // Map to the format we need: { id, name } and sort alphabetically
      const formattedSubjects = subcategories
        .map((sub: any) => ({
          id: sub.id,
          name: sub.name,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
      setSubjects(formattedSubjects)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    } finally {
      setSubjectsLoading(false)
    }
  }

  const fetchTutors = async (page = currentPage) => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (selectedSubject) queryParams.append('subject', selectedSubject)
      if (selectedGrade) queryParams.append('grade', selectedGrade)
      if (minFee) queryParams.append('minFee', minFee)
      if (maxFee) queryParams.append('maxFee', maxFee)
      if (location) queryParams.append('location', location.trim())
      if (!isStudent) {
        queryParams.append('page', String(page))
        queryParams.append('limit', '12')
      }

      const queryString = queryParams.toString()
      const url = isStudent
        ? `/student/tutors${queryString ? `?${queryString}` : ''}`
        : `/public/tutors${queryString ? `?${queryString}` : ''}`
      const response = await api.get(url)
      const normalizedTutors = (response.data.tutors || []).map((tutor: any) => {
        const normalizedSubjects = Array.isArray(tutor.subjects)
          ? tutor.subjects.map((item: any) =>
              typeof item === 'string' ? { subject: { name: item } } : item
            )
          : []

        return {
          ...tutor,
          subjects: normalizedSubjects,
          saved: isStudent ? Boolean(tutor.saved) : false,
        }
      })

      setTutors(normalizedTutors)
      if (!isStudent) {
        setTotalCount(response.data.total ?? normalizedTutors.length)
        setTotalPages(response.data.totalPages ?? 1)
        setCurrentPage(response.data.page ?? page)
      }
    } catch (error) {
      console.error('Error fetching tutors:', error)
      setErrorMessage('Unable to load tutors right now. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    fetchTutors(1)
  }, [selectedSubject, selectedGrade, minFee, maxFee, location, isStudent])

  const handleSaveTutor = async (tutor: Tutor) => {
    if (!isStudent) {
      navigate('/login')
      return
    }

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
        tutor.saved ? 'Tutor removed from saved tutors.' : 'Tutor added to your saved tutors.'
      )
    } catch (error) {
      console.error('Error updating saved tutor:', error)
      setErrorMessage('Unable to update saved tutors. Please try again.')
    } finally {
      setSavingTutorId(null)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleOpenBooking = (tutor: Tutor) => {
    if (!isStudent) {
      navigate('/login')
      return
    }

    setSelectedTutor(tutor)
    setIsBookingModalOpen(true)
    setStatusMessage('')
    setErrorMessage('')
  }

  const handleBookingSuccess = () => {
    setIsBookingModalOpen(false)
    setSelectedTutor(null)
    setStatusMessage('Booking created successfully!')
    setTimeout(() => {
      navigate('/student/bookings')
    }, 1500)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchTutors(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearFilters = () => {
    setSelectedSubject('')
    setSelectedGrade('')
    setMinFee('')
    setMaxFee('')
    setLocation('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const filteredTutors = tutors.filter((tutor) => {
    const fullName = `${tutor.firstName} ${tutor.lastName}`.toLowerCase()
    const tagline = (tutor.tagline || '').toLowerCase()
    const tutorSubjects = tutor.subjects.map((s) => s.subject.name.toLowerCase()).join(' ')
    const locationStr = `${tutor.city || ''} ${tutor.state || ''} ${tutor.country || ''}`.toLowerCase()

    const searchLower = searchTerm.toLowerCase()
    return (
      fullName.includes(searchLower) ||
      tagline.includes(searchLower) ||
      tutorSubjects.includes(searchLower) ||
      locationStr.includes(searchLower)
    )
  })

  const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'College', 'Adult']

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #e6f0f7, #fef5e7)' }}>
      <Navbar />

      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden h-48 md:h-56"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=2000&q=80')",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(1, 44, 84, 0.85), rgba(1, 74, 122, 0.75))',
            }}
          />
        </div>
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2">
              Browse Expert Tutors
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Find your perfect match from our network of qualified educators
            </p>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/50"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#012c54] focus:outline-none transition-colors"
              />
            </div>

            {/* Location Input */}
            <div className="relative lg:w-64">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="City, state or country..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#012c54] focus:outline-none transition-colors"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${showFilters
                  ? 'text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              style={showFilters ? { backgroundColor: '#012c54' } : {}}
            >
              <Filter className="w-5 h-5" />
              Filters
              {(selectedSubject || selectedGrade || minFee || maxFee) && (
                <span className="bg-[#f5a11a] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {[selectedSubject, selectedGrade, minFee, maxFee].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-slate-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Subject Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-[#012c54] focus:outline-none"
                    disabled={subjectsLoading}
                  >
                    <option value="">{subjectsLoading ? 'Loading subjects...' : 'All Subjects'}</option>
                    {!subjectsLoading && subjects.map((subject) => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Grade Level</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-[#012c54] focus:outline-none"
                  >
                    <option value="">All Grades</option>
                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Fee */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Min Fee
                  </label>
                  <input
                    type="number"
                    placeholder="$0"
                    value={minFee}
                    onChange={(e) => setMinFee(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-[#012c54] focus:outline-none"
                  />
                </div>

                {/* Max Fee */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Max Fee
                  </label>
                  <input
                    type="number"
                    placeholder="$999"
                    value={maxFee}
                    onChange={(e) => setMaxFee(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-[#012c54] focus:outline-none"
                  />
                </div>

              </div>

              {/* Clear Filters */}
              {(selectedSubject || selectedGrade || minFee || maxFee || location) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Status Messages */}
        {statusMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-center">
            {statusMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-center">
            {errorMessage}
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-slate-700 font-semibold">
            <Users className="w-5 h-5 inline mr-2" />
            {isStudent
              ? `${filteredTutors.length} ${filteredTutors.length === 1 ? 'tutor found' : 'tutors found'}`
              : `${totalCount} ${totalCount === 1 ? 'tutor found' : 'tutors found'}`}
          </p>
          {!isStudent && totalPages > 1 && (
            <p className="text-sm text-slate-500">Page {currentPage} of {totalPages}</p>
          )}
        </div>

        {/* Tutors Grid */}
        {loading ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#012c54] border-t-transparent"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading tutors...</p>
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No tutors found</h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || selectedSubject || selectedGrade || minFee || maxFee || location
                ? 'Try adjusting your filters or search terms.'
                : 'Check back soon for new tutors joining JTutors.'}
            </p>
            {(searchTerm || selectedSubject || selectedGrade || minFee || maxFee || location) && (
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-[#012c54] text-white rounded-xl font-semibold hover:bg-[#014a7a] transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor, index) => {
              const heroImage = resolveImageUrl(tutor.profileImage || '')
              const coverImage = resolveImageUrl(tutor.coverImage || '')
              const initials = `${tutor.firstName?.charAt(0) ?? ''}${tutor.lastName?.charAt(0) ?? ''}` || 'JT'
              const isSaving = savingTutorId === tutor.id

              return (
                <motion.div
                  key={tutor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden flex flex-col border border-slate-100"
                >
                  {/* Cover Banner Section */}
                  <div className="h-40 bg-gradient-to-r from-[#012c54] via-indigo-700 to-slate-700 relative overflow-hidden">
                    {coverImage ? (
                      <img src={coverImage} alt="Cover" className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  {/* Avatar Section */}
                  <div className="relative -mt-16 pb-4 px-6 flex justify-center">
                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveTutor(tutor)}
                      disabled={isSaving}
                      className={`absolute -top-8 right-4 rounded-full p-2.5 shadow-md bg-white transition-all hover:scale-110 ${tutor.saved ? 'text-[#f5a11a]' : 'text-slate-400 hover:text-[#f5a11a]'
                        }`}
                      aria-label={tutor.saved ? 'Remove from saved' : 'Save tutor'}
                    >
                      {tutor.saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                    </button>

                    {/* Circular Avatar */}
                    <div className="h-28 w-28 rounded-full border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-br from-[#012c54] to-[#014a7a]">
                      {heroImage ? (
                        <img src={heroImage} alt={`${tutor.firstName} ${tutor.lastName}`} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-4 px-6 pb-6 flex flex-col flex-1">
                    {/* Name and Price */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 line-clamp-1">
                          {tutor.firstName} {tutor.lastName}
                        </h3>
                        {(tutor.city || tutor.country) && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {tutor.city ? `${tutor.city}, ${tutor.state || tutor.country}` : tutor.country}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#012c54]">${tutor.hourlyFee}</div>
                        <div className="text-xs text-slate-500">per hour</div>
                      </div>
                    </div>

                    {/* Tagline */}
                    {tutor.tagline && (
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{tutor.tagline}</p>
                    )}

                    {/* Subjects */}
                    {tutor.subjects.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          Subjects
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {tutor.subjects.slice(0, 3).map((subjectItem, idx) => (
                            <span
                              key={`${subjectItem.subject.name}-${idx}`}
                              className="px-3 py-1 bg-[#e6f0f7] text-[#012c54] rounded-full text-xs font-medium"
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

                    {/* Grades */}
                    {tutor.gradesCanTeach && tutor.gradesCanTeach.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          Grades
                        </p>
                        <p className="text-sm text-slate-600">
                          {tutor.gradesCanTeach.slice(0, 4).join(', ')}
                          {tutor.gradesCanTeach.length > 4 && ` +${tutor.gradesCanTeach.length - 4} more`}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-auto flex flex-col gap-2 pt-4">
                      <button
                        onClick={() => handleOpenBooking(tutor)}
                        className="w-full py-3 bg-[#f5a11a] text-white rounded-xl font-bold hover:bg-[#c48115] transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        <CalendarPlus size={18} />
                        {isStudent ? 'Book Session' : 'Login to Book'}
                      </button>
                      <Link
                        to={`/tutors/${tutor.id}`}
                        className="w-full py-2.5 border-2 border-[#012c54] text-[#012c54] rounded-xl font-semibold hover:bg-[#012c54] hover:text-white transition-colors text-center"
                      >
                        View Full Profile
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!isStudent && !loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10 mb-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:border-[#012c54] hover:text-[#012c54] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              &larr; Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p as number)}
                    className={`w-10 h-10 rounded-xl font-semibold transition-colors ${
                      currentPage === p
                        ? 'text-white shadow-md'
                        : 'border-2 border-slate-200 text-slate-700 hover:border-[#012c54] hover:text-[#012c54]'
                    }`}
                    style={currentPage === p ? { backgroundColor: '#012c54' } : {}}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:border-[#012c54] hover:text-[#012c54] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookTutorModal
        tutor={selectedTutor}
        isOpen={isBookingModalOpen && isStudent}
        onClose={() => {
          setIsBookingModalOpen(false)
          setSelectedTutor(null)
        }}
        onBooked={handleBookingSuccess}
        onError={(message) => setErrorMessage(message)}
      />

      <Footer />
    </div>
  )
}

export default BrowseTutors

