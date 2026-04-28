import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Video, Clock, ExternalLink, BookOpen, ChevronRight } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'

interface Tutor {
  id: string
  firstName: string | null
  lastName: string | null
  profileImage: string | null
  jtutorsEmail: string | null
}

interface Course {
  id: string
  title: string
  description: string
  price: number
  schedule: string | null
  meetingLink: string | null
  meetingType: string | null
  tutor: Tutor
}

interface Enrollment {
  id: string
  status: string
  paidAt: string | null
  amount: number
  course: Course
}

const MyCourses = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/enrollments/my')
      .then((res) => setEnrollments(res.data.enrollments))
      .catch(() => setError('Could not load your courses.'))
      .finally(() => setLoading(false))
  }, [])

  const meetingLabel = (type: string | null) => {
    const map: Record<string, string> = {
      GOOGLE_MEET: 'Google Meet',
      GOOGLE_CLASSROOM: 'Google Classroom',
      ZOOM: 'Zoom',
      OTHER: 'Online',
    }
    return type ? (map[type] ?? type) : 'Online'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your enrolled courses and class access links.</p>
          </div>
          <Link
            to="/student/courses"
            className="text-sm font-medium text-[#012c54] hover:underline flex items-center gap-1"
          >
            Browse More <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse h-36" />)}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-14 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No courses yet</h3>
            <p className="text-slate-500 text-sm mt-1">Browse available courses and enroll to get started.</p>
            <Link
              to="/student/courses"
              className="mt-4 inline-block px-5 py-2.5 bg-[#012c54] text-white font-semibold text-sm rounded-xl hover:bg-[#012c54]/90 transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              const { course } = enrollment
              const tutorName = `${course.tutor.firstName ?? ''} ${course.tutor.lastName ?? ''}`.trim()

              return (
                <div key={enrollment.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-base">{course.title}</h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{course.description}</p>

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                        {course.schedule && <span className="flex items-center gap-1"><Clock size={11} /> {course.schedule}</span>}
                        <span className="text-sky-600 font-medium">{meetingLabel(course.meetingType)}</span>
                        {tutorName && <span>Tutor: {tutorName}</span>}
                        {enrollment.paidAt && (
                          <span>Enrolled {new Date(enrollment.paidAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* JTutors Email hint */}
                      {course.tutor.jtutorsEmail && (
                        <p className="text-xs text-slate-400 mt-1">
                          Class hosted via <span className="font-medium text-slate-600">{course.tutor.jtutorsEmail}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-[#012c54]">${enrollment.amount}</div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Paid</span>
                    </div>
                  </div>

                  {/* Join Class Button */}
                  {course.meetingLink ? (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <a
                        href={course.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#012c54] text-white font-semibold text-sm rounded-xl hover:bg-[#012c54]/90 transition-colors"
                      >
                        <Video size={15} /> Join Class <ExternalLink size={13} />
                      </a>
                    </div>
                  ) : (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-slate-400 italic">
                        Class link will appear here once the tutor sets it up.
                      </p>
                    </div>
                  )}
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

export default MyCourses
