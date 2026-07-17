import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
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
import { TUTOR_GRADE_OPTIONS } from '../../constants/grades'

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
  languagesSpoken?: string[]
  profileImage?: string
  coverImage?: string
  experienceCount?: number
  educationCount?: number
  subjects: Array<{
    subject: {
      name: string
    }
  }>
  saved?: boolean
}

interface TutorResponse {
  tutors: Tutor[]
  total?: number
  totalMatchingTutors?: number
  page?: number
  totalPages?: number
}

const BrowseTutors = () => {
  const { user } = useAuthStore()
  const isStudent = user?.role === 'STUDENT'
  const [searchParams, setSearchParams] = useSearchParams()
  const getInitialPage = () => {
    const page = Number(searchParams.get('page'))
    return Number.isInteger(page) && page > 0 ? page : 1
  }
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || '')
  const [selectedGrade, setSelectedGrade] = useState(searchParams.get('grade') || '')
  const [minFee, setMinFee] = useState(searchParams.get('minFee') || '')
  const [maxFee, setMaxFee] = useState(searchParams.get('maxFee') || '')
  const [location, setLocation] = useState(searchParams.get('location') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [savingTutorId, setSavingTutorId] = useState<string | null>(null)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(getInitialPage)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const navigate = useNavigate()
  const filtersSignature = [
    searchTerm,
    selectedSubject,
    selectedGrade,
    minFee,
    maxFee,
    location,
    isStudent ? 'student' : 'public',
  ].join('\u001f')
  const previousFiltersSignatureRef = useRef(filtersSignature)

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

  const buildTutorSearchParams = (page: number) => {
    const queryParams = new URLSearchParams()
    const normalizedSearch = searchTerm.trim()
    const normalizedLocation = location.trim()

    if (normalizedSearch) queryParams.set('search', normalizedSearch)
    if (selectedSubject) queryParams.set('subject', selectedSubject)
    if (selectedGrade) queryParams.set('grade', selectedGrade)
    if (minFee) queryParams.set('minFee', minFee)
    if (maxFee) queryParams.set('maxFee', maxFee)
    if (normalizedLocation) queryParams.set('location', normalizedLocation)
    queryParams.set('page', String(page))

    return queryParams
  }

  const fetchTutors = async (page = currentPage) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const queryParams = new URLSearchParams()
      const normalizedSearch = searchTerm.trim()
      const normalizedLocation = location.trim()

      if (normalizedSearch) queryParams.append('search', normalizedSearch)
      if (selectedSubject) queryParams.append('subject', selectedSubject)
      if (selectedGrade) queryParams.append('grade', selectedGrade)
      if (minFee) queryParams.append('minFee', minFee)
      if (maxFee) queryParams.append('maxFee', maxFee)
      if (normalizedLocation) queryParams.append('location', normalizedLocation)
      queryParams.append('page', String(page))
      if (isStudent) queryParams.append('limit', '12')

      const queryString = queryParams.toString()
      const url = isStudent
        ? `/student/tutors${queryString ? `?${queryString}` : ''}`
        : `/public/tutors${queryString ? `?${queryString}` : ''}`
      let response

      try {
        response = await api.get<TutorResponse>(url)
      } catch (primaryError) {
        if (!isStudent) {
          throw primaryError
        }

        // Fallback to public tutors so the page still works if student-specific listing fails.
        response = await api.get<TutorResponse>(`/public/tutors${queryString ? `?${queryString}` : ''}`)
      }

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
          experienceCount: tutor.experienceCount ?? (Array.isArray(tutor.experiences) ? tutor.experiences.length : 0),
          educationCount: tutor.educationCount ?? (Array.isArray(tutor.educations) ? tutor.educations.length : 0),
        }
      })

      setTutors(normalizedTutors)
      setTotalCount(
        isStudent
          ? (response.data.total ?? normalizedTutors.length)
          : (response.data.totalMatchingTutors ?? response.data.total ?? normalizedTutors.length)
      )
      setTotalPages(isStudent ? (response.data.totalPages ?? 1) : 1)
      setCurrentPage(isStudent ? (response.data.page ?? page) : 1)
    } catch (error) {
      console.error('Error fetching tutors:', error)
      setErrorMessage('Unable to load tutors right now. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const filtersChanged = previousFiltersSignatureRef.current !== filtersSignature
    previousFiltersSignatureRef.current = filtersSignature

    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1)
      return
    }

    const pageToLoad = filtersChanged ? 1 : currentPage
    const timeout = window.setTimeout(() => {
      setSearchParams(buildTutorSearchParams(pageToLoad), { replace: filtersChanged })
      fetchTutors(pageToLoad)
    }, filtersChanged ? 250 : 0)

    return () => window.clearTimeout(timeout)
  }, [searchTerm, selectedSubject, selectedGrade, minFee, maxFee, location, currentPage, isStudent])

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
    if (!isStudent) {
      navigate('/register?role=student')
      return
    }
    setCurrentPage(page)
    setSearchParams(buildTutorSearchParams(page))
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

  const grades = TUTOR_GRADE_OPTIONS
  const visibleTutorCount = totalCount || tutors.length
  const showPagination = isStudent && totalPages > 1

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #e6f0f7, #fef5e7)' }}>
      <Navbar />

      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden h-64 md:h-80"
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
              background: 'linear-gradient(135deg, rgba(1, 44, 84, 0.95) 0%, rgba(1, 74, 122, 0.85) 60%, rgba(245, 161, 26, 0.45) 100%)',
            }}
          />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 drop-shadow-lg">
                Find Your Perfect Tutor
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl">
                Browse verified, background-checked educators ready to help you succeed
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2 text-white/90">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold">Expert Tutors</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold">All Grade Levels</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <div className="w-8 h-8 rounded-full bg-[#f5a11a]/40 flex items-center justify-center">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold">50+ Subjects</span>
                </div>
              </div>
            </motion.div>
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
            {`${visibleTutorCount} ${visibleTutorCount === 1 ? 'tutor found' : 'tutors found'}`}
          </p>
          {showPagination && (
            <p className="text-sm text-slate-500">Page {currentPage} of {totalPages}</p>
          )}
        </div>

        {/* Tutors Grid */}
        {loading ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#012c54] border-t-transparent"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading tutors...</p>
          </div>
        ) : tutors.length === 0 ? (
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
            {tutors.map((tutor, index) => {
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
                      <Link
                        to={isStudent ? `/tutors/${tutor.id}` : '/register?role=student'}
                        className="text-xl font-bold text-slate-900 line-clamp-1 hover:text-[#012c54] transition-colors block"
                      >
                          {(tutor.firstName || tutor.lastName)
                            ? `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim()
                            : 'View Tutor Profile'}
                        </Link>
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
                          {tutor.subjects.slice(0, 5).map((subjectItem, idx) => (
                            <span
                              key={`${subjectItem.subject.name}-${idx}`}
                              className="px-3 py-1 bg-[#e6f0f7] text-[#012c54] rounded-full text-xs font-medium"
                            >
                              {subjectItem.subject.name}
                            </span>
                          ))}
                          {tutor.subjects.length > 5 && (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                              +{tutor.subjects.length - 5} more
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

                    {/* Languages & Stats */}
                    {((tutor.languagesSpoken && tutor.languagesSpoken.length > 0) ||
                      (tutor.experienceCount ?? 0) > 0 ||
                      (tutor.educationCount ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                        {tutor.languagesSpoken && tutor.languagesSpoken.length > 0 && (
                          <span className="flex items-center gap-1">
                            🌐 {tutor.languagesSpoken.slice(0, 2).join(', ')}
                          </span>
                        )}
                        {(tutor.experienceCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {tutor.experienceCount} {tutor.experienceCount === 1 ? 'experience' : 'experiences'}
                          </span>
                        )}
                        {(tutor.educationCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {tutor.educationCount} {tutor.educationCount === 1 ? 'qualification' : 'qualifications'}
                          </span>
                        )}
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
                        to={isStudent ? `/tutors/${tutor.id}` : '/register?role=student'}
                        className="w-full py-2.5 border-2 border-[#012c54] text-[#012c54] rounded-xl font-semibold hover:bg-[#012c54] hover:text-white transition-colors text-center"
                      >
                        {isStudent ? 'View Full Profile' : 'Create Account to View Full Profile'}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && showPagination && (
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

