import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'

interface HourLog {
  totalHours: number
  approvedHours: number
  pendingOrDeclinedHours: number
}

const formatHours = (value: number) => value.toFixed(2)

const StudentHourLog = () => {
  const [log, setLog] = useState<HourLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchHourLog = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/hour-log')
      setLog(response.data)
    } catch (err) {
      console.error('Error fetching tutoring hours:', err)
      setError('Unable to load your tutoring hours right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHourLog()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Tutoring Hour Log</h1>
          <p className="text-slate-600 mt-2">
            Track the total time you’ve spent learning, see what’s been approved, and follow up on pending sessions.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">Calculating your hours…</div>
        ) : log ? (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl shadow p-6 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total hours</p>
              <p className="text-3xl font-bold text-slate-900 mt-3">{formatHours(log.totalHours)}</p>
              <p className="text-sm text-slate-500 mt-1">All booked sessions, including pending approvals.</p>
            </div>
            <div className="bg-white rounded-3xl shadow p-6 border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Approved hours</p>
              <p className="text-3xl font-bold text-emerald-700 mt-3">{formatHours(log.approvedHours)}</p>
              <p className="text-sm text-emerald-600 mt-1">Sessions fully approved by tutors and admins.</p>
            </div>
            <div className="bg-white rounded-3xl shadow p-6 border border-amber-100">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pending / declined</p>
              <p className="text-3xl font-bold text-amber-700 mt-3">{formatHours(log.pendingOrDeclinedHours)}</p>
              <p className="text-sm text-amber-600 mt-1">
                Sessions awaiting completion, tutor approval, or declined sessions.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow p-12 text-center text-slate-500">
            No data available yet. Book sessions to start tracking your tutoring hours.
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default StudentHourLog


