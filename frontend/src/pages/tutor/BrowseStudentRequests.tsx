import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BookOpen, GraduationCap, DollarSign, Clock, MessageCircle, Filter } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'

interface TutorRequest {
  id: string
  title: string
  description: string
  subject: string | null
  grade: string | null
  budgetMin: number | null
  budgetMax: number | null
  preferredSchedule: string | null
  sessionType: string | null
  status: string
  createdAt: string
  student: {
    id: string
    firstName: string | null
    lastName: string | null
    profileImage: string | null
    city: string | null
    state: string | null
  }
}

const BrowseStudentRequests = () => {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<TutorRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchRequests()
    fetchSubjects()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (subjectFilter) params.append('subject', subjectFilter)
      if (gradeFilter) params.append('grade', gradeFilter)
      const response = await api.get(`/tutor-requests/open?${params.toString()}`)
      setRequests(response.data)
    } catch (error) {
      console.error('Error fetching student requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects')
      const names = response.data.map((s: any) => s.name).sort()
      setSubjects(names)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [subjectFilter, gradeFilter])

  const handleMessageStudent = async (studentId: string) => {
    try {
      await api.post('/messages/conversations', { studentId })
      navigate('/tutor/messages')
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  const grades = ['K-5', '6-8', '9-12', 'College', 'Adult']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#012c54]">Student Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Browse what students are looking for and reach out</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow p-4 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-[#012c54] md:hidden"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${showFilters ? '' : 'hidden md:grid'}`}>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grade Level</label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
              >
                <option value="">All levels</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setSubjectFilter(''); setGradeFilter('') }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading student requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="font-semibold text-gray-600 mb-2">No requests found</h3>
            <p className="text-sm text-gray-400">
              {subjectFilter || gradeFilter
                ? 'Try adjusting your filters'
                : 'No students have posted requests yet. Check back later!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const studentName = [req.student.firstName, req.student.lastName].filter(Boolean).join(' ') || 'Student'
              const location = [req.student.city, req.student.state].filter(Boolean).join(', ')
              return (
                <div key={req.id} className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#012c54] text-lg">{req.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{req.description}</p>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {req.subject && (
                          <span className="flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-1 rounded-full text-xs">
                            <BookOpen className="w-3 h-3" /> {req.subject}
                          </span>
                        )}
                        {req.grade && (
                          <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-xs">
                            <GraduationCap className="w-3 h-3" /> {req.grade}
                          </span>
                        )}
                        {(req.budgetMin || req.budgetMax) && (
                          <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs">
                            <DollarSign className="w-3 h-3" />
                            {req.budgetMin && req.budgetMax
                              ? `$${req.budgetMin} - $${req.budgetMax}/hr`
                              : req.budgetMin ? `From $${req.budgetMin}/hr` : `Up to $${req.budgetMax}/hr`}
                          </span>
                        )}
                        {req.preferredSchedule && (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs">
                            <Clock className="w-3 h-3" /> {req.preferredSchedule}
                          </span>
                        )}
                        {req.sessionType && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                            {req.sessionType === 'ONLINE' ? 'Online' : req.sessionType === 'IN_PERSON' ? 'In-person' : 'Either'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                        <span>Posted by <strong className="text-gray-600">{studentName}</strong></span>
                        {location && <span>{location}</span>}
                        <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleMessageStudent(req.student.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#f5a11a] text-white text-sm font-semibold rounded-full hover:bg-[#f5a11a]/90 transition-colors ml-4 flex-shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" /> Message
                    </button>
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

export default BrowseStudentRequests
