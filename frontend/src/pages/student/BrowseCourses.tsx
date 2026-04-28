import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Clock, Video, ChevronRight, BookOpen } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'

interface Tutor {
  id: string
  firstName: string | null
  lastName: string | null
  profileImage: string | null
  tagline: string | null
  subjects: Array<{ subject: { name: string } }>
}

interface Course {
  id: string
  title: string
  description: string
  price: number
  schedule: string | null
  meetingType: string | null
  maxStudents: number | null
  createdAt: string
  tutor: Tutor
  _count: { enrollments: number }
}

const BrowseCourses = () => {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async (q?: string) => {
    try {
      setLoading(true)
      const res = await api.get('/courses', { params: q ? { search: q } : {} })
      setCourses(res.data.courses)
    } catch {
      setError('Could not load courses.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCourses(search)
  }

  const handleEnroll = async (courseId: string) => {
    setEnrolling(courseId)
    setError('')
    try {
      const res = await api.post('/enrollments/checkout', { courseId })
      // Redirect to Stripe Checkout
      if (res.data.url) {
        window.location.href = res.data.url
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not start checkout. Please try again.')
      setEnrolling(null)
    }
  }

  const meetingLabel = (type: string | null) => {
    if (!type) return null
    const map: Record<string, string> = {
      GOOGLE_MEET: 'Google Meet',
      GOOGLE_CLASSROOM: 'Google Classroom',
      ZOOM: 'Zoom',
      OTHER: 'Online',
    }
    return map[type] ?? type
  }

  const filtered = courses.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      `${c.tutor.firstName} ${c.tutor.lastName}`.toLowerCase().includes(q) ||
      c.tutor.subjects.some((s) => s.subject.name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div
          className="rounded-3xl p-8 mb-8 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #012c54 0%, #014a8f 60%, #0162ba 100%)' }}
        >
          <h1 className="text-3xl font-bold mb-1">Browse Courses</h1>
          <p className="text-sky-200 text-sm mb-5">Enroll in expert-led courses. Pay once, access your class link immediately.</p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="flex-1 bg-white/10 backdrop-blur border border-white/20 rounded-xl flex items-center gap-2 px-3 py-2">
              <Search className="w-4 h-4 text-white/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by subject, tutor…"
                className="flex-1 bg-transparent text-white placeholder-white/50 text-sm outline-none"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-[#f5a11a] text-white font-semibold text-sm rounded-xl hover:bg-yellow-500 transition-colors">
              Search
            </button>
          </form>
          <div className="absolute -right-12 -top-12 w-56 h-56 bg-white/5 rounded-full" />
        </div>

        {/* My Courses shortcut */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">{filtered.length} course{filtered.length !== 1 ? 's' : ''} available</p>
          <button
            onClick={() => navigate('/student/my-courses')}
            className="text-sm font-medium text-[#012c54] hover:underline flex items-center gap-1"
          >
            My Enrolled Courses <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse h-52" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-14 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No courses found</h3>
            <p className="text-slate-500 text-sm mt-1">
              {search ? 'Try different search terms.' : 'No courses are published yet. Check back soon.'}
            </p>
            {search && (
              <button onClick={() => { setSearch(''); fetchCourses() }} className="mt-3 text-sm text-[#012c54] hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((course) => {
              const tutorImage = resolveImageUrl(course.tutor.profileImage || '')
              const tutorName = `${course.tutor.firstName ?? ''} ${course.tutor.lastName ?? ''}`.trim()
              const isFull = course.maxStudents !== null && course._count.enrollments >= course.maxStudents

              return (
                <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col">
                  {/* Top band */}
                  <div className="h-3 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #012c54, #0162ba)' }} />

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.description}</p>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-3">
                      {course.schedule && <span className="flex items-center gap-1"><Clock size={11} /> {course.schedule}</span>}
                      {course.meetingType && (
                        <span className="flex items-center gap-1 text-sky-600 font-medium">
                          <Video size={11} /> {meetingLabel(course.meetingType)}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Users size={11} /> {course._count.enrollments} enrolled{course.maxStudents ? ` / ${course.maxStudents}` : ''}</span>
                    </div>

                    {/* Subjects */}
                    {course.tutor.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {course.tutor.subjects.slice(0, 3).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full text-xs">{s.subject.name}</span>
                        ))}
                      </div>
                    )}

                    {/* Tutor */}
                    <div className="flex items-center gap-2 mt-auto mb-4">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center text-xs font-bold text-[#012c54]">
                        {tutorImage ? (
                          <img src={tutorImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          tutorName.charAt(0)
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{tutorName || 'JTutors Tutor'}</span>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xl font-bold text-[#012c54]">${course.price}</span>
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={!!enrolling || isFull}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isFull ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#012c54] text-white hover:bg-[#012c54]/90'} ${enrolling === course.id ? 'opacity-60' : ''}`}
                      >
                        {isFull ? 'Course Full' : enrolling === course.id ? 'Redirecting…' : 'Enroll Now'}
                      </button>
                    </div>
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

export default BrowseCourses
