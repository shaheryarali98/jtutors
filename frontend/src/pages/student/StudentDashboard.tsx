import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../lib/api'

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
}

const StudentDashboard = () => {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTutors()
  }, [])

  const fetchTutors = async () => {
    try {
      const response = await api.get('/student/tutors')
      setTutors(response.data.tutors)
    } catch (error) {
      console.error('Error fetching tutors:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTutors = tutors.filter(tutor => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${tutor.firstName} ${tutor.lastName}`.toLowerCase()
    const subjects = tutor.subjects.map(s => s.subject.name.toLowerCase()).join(' ')
    
    return fullName.includes(searchLower) || 
           subjects.includes(searchLower) ||
           tutor.city?.toLowerCase().includes(searchLower)
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Discover Your Perfect Tutor</h1>
            <p className="text-slate-600 mt-2">
              Search by name, subject, or location to find tutors tailored to your learning goals.
            </p>
          </div>
          <Link
            to="/student/profile"
            className="btn btn-outline"
          >
            Update my learner profile
          </Link>
        </div>

        <div className="mb-6 bg-white rounded-2xl shadow px-4 py-3 flex items-center gap-3">
          <span className="text-slate-400 text-lg">🔎</span>
          <input
            type="text"
            placeholder="Search by name, subject, or city..."
            className="flex-1 outline-none text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">
            Loading tutors…
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-12 text-center">
            <div className="text-6xl mb-3">🤔</div>
            <h3 className="text-xl font-semibold text-slate-900">No tutors found</h3>
            <p className="text-slate-500 mt-2">
              {searchTerm ? 'Try broadening your search terms.' : 'Check back soon for new tutors joining JTutor.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => (
              <div key={tutor.id} className="bg-white rounded-3xl shadow hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative">
                  <div className="h-40 bg-gradient-to-r from-primary-200 via-indigo-100 to-slate-100">
                    {tutor.profileImage && (
                      <img
                        src={tutor.profileImage}
                        alt={`${tutor.firstName} ${tutor.lastName}`}
                        className="h-full w-full object-cover opacity-90"
                      />
                    )}
                  </div>
                  <div className="absolute -bottom-10 left-6 h-20 w-20 rounded-2xl border-4 border-white shadow bg-white overflow-hidden flex items-center justify-center text-3xl text-primary-600">
                    {tutor.profileImage ? (
                      <img src={tutor.profileImage} alt={`${tutor.firstName}`} className="h-full w-full object-cover" />
                    ) : (
                      tutor.firstName?.charAt(0) || 'T'
                    )}
                  </div>
                </div>
                <div className="pt-12 px-6 pb-6">
                  <div className="flex items-start justify-between">
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
                    <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                      {tutor.tagline}
                    </p>
                  )}

                  {tutor.subjects.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Subjects</p>
                      <div className="flex flex-wrap gap-2">
                        {tutor.subjects.slice(0, 3).map((ts, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium"
                          >
                            {ts.subject.name}
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

                  <Link
                    to={`/student/tutor/${tutor.id}`}
                    className="mt-6 inline-flex w-full justify-center btn btn-primary"
                  >
                    View Tutor Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard


