import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Video, ExternalLink, Loader } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'

interface EnrollmentData {
  id: string
  status: string
  amount: number
  paidAt: string | null
  course: {
    title: string
    description: string
    schedule: string | null
    meetingLink: string | null
    meetingType: string | null
    tutor: {
      firstName: string | null
      lastName: string | null
      jtutorsEmail: string | null
    }
  }
}

const EnrollmentSuccess = () => {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const enrollmentId = searchParams.get('enrollmentId') // dev bypass only
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found.')
      setLoading(false)
      return
    }
    // Poll briefly while webhook processes
    let attempts = 0
    const poll = async () => {
      try {
        // Pass enrollmentId as query param for dev bypass (session_id=dev_bypass)
        const url = enrollmentId
          ? `/enrollments/session/${sessionId}?enrollmentId=${enrollmentId}`
          : `/enrollments/session/${sessionId}`
        const res = await api.get(url)
        if (res.data.enrollment.status === 'PAID') {
          setEnrollment(res.data.enrollment)
          setLoading(false)
        } else if (attempts < 5) {
          attempts++
          setTimeout(poll, 2000)
        } else {
          // Webhook may be delayed — still show the enrollment details
          setEnrollment(res.data.enrollment)
          setLoading(false)
        }
      } catch {
        setError('Could not verify enrollment. Please check "My Courses" in a moment.')
        setLoading(false)
      }
    }
    poll()
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-16 text-center">

        {loading && (
          <div className="flex flex-col items-center gap-4 text-slate-600">
            <Loader className="w-10 h-10 animate-spin text-[#012c54]" />
            <p className="text-sm">Confirming your enrollment…</p>
          </div>
        )}

        {!loading && error && (
          <div>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <Link to="/student/my-courses" className="text-[#012c54] font-semibold hover:underline text-sm">
              Go to My Courses
            </Link>
          </div>
        )}

        {!loading && !error && enrollment && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <CheckCircle className="w-14 h-14 mx-auto text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">You're enrolled!</h1>
            <p className="text-slate-500 text-sm mb-6">
              Payment of <strong>${enrollment.amount}</strong> confirmed. You now have access to the course.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-left mb-6">
              <h2 className="font-bold text-slate-900 mb-1">{enrollment.course.title}</h2>
              {enrollment.course.schedule && (
                <p className="text-sm text-slate-500 mb-1">📅 {enrollment.course.schedule}</p>
              )}
              {enrollment.course.tutor.jtutorsEmail && (
                <p className="text-xs text-slate-400">
                  Hosted via {enrollment.course.tutor.jtutorsEmail}
                </p>
              )}
            </div>

            {enrollment.course.meetingLink ? (
              <a
                href={enrollment.course.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#012c54] text-white font-semibold rounded-xl hover:bg-[#012c54]/90 transition-colors text-sm mb-4"
              >
                <Video size={15} /> Join Class Now <ExternalLink size={13} />
              </a>
            ) : (
              <p className="text-sm text-slate-400 italic mb-4">
                The tutor will add the class link shortly.
              </p>
            )}

            <div className="mt-2">
              <Link to="/student/my-courses" className="text-sm text-[#012c54] font-medium hover:underline">
                View all my courses →
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default EnrollmentSuccess
