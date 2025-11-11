import { useEffect, useState } from 'react'
import api from '../../lib/api'

interface Subject {
  id: string
  name: string
}

interface TutorSubject {
  id: string
  subjectId: string
  subject: Subject
}

const Subjects = () => {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [tutorSubjects, setTutorSubjects] = useState<TutorSubject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchSubjects()
    fetchTutorSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects')
      setAllSubjects(response.data.subjects)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const fetchTutorSubjects = async () => {
    try {
      const response = await api.get('/auth/me')
      const subjects = response.data.tutor?.subjects || []
      setTutorSubjects(subjects)
      setSelectedSubjects(subjects.map((ts: TutorSubject) => ts.subjectId))
    } catch (error) {
      console.error('Error fetching tutor subjects:', error)
    }
  }

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    )
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setFeedback('')
      setErrorMessage('')
      
      // Find subjects to add and remove
      const currentIds = tutorSubjects.map(ts => ts.subjectId)
      const toAdd = selectedSubjects.filter(id => !currentIds.includes(id))
      const toRemove = currentIds.filter(id => !selectedSubjects.includes(id))

      // Add new subjects
      if (toAdd.length > 0) {
        const response = await api.post('/tutor/profile/subjects', { subjectIds: toAdd })
        if (response.data.profileCompletion === 100) {
          setFeedback('Subjects updated • Profile now complete!')
        } else {
          setFeedback('Subjects updated successfully!')
        }
      }

      // Remove unchecked subjects
      for (const subjectId of toRemove) {
        const response = await api.delete(`/tutor/profile/subjects/${subjectId}`)
        if (!feedback) {
          setFeedback(
            response.data.profileCompletion === 100
              ? 'Subjects updated • Profile still complete'
              : 'Subjects updated successfully!'
          )
        }
      }

      await fetchTutorSubjects()
      window.dispatchEvent(new Event('tutor-profile-updated'))
      if (!feedback) {
        setFeedback('Subjects updated successfully!')
      }
      setTimeout(() => setFeedback(''), 3000)
    } catch (error) {
      console.error('Error updating subjects:', error)
      setErrorMessage('Error updating subjects. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="section-title">Subjects You Can Teach</h2>
      <p className="text-gray-600 mb-6">Select all subjects you are qualified to teach</p>

      {feedback && (
        <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">
          {feedback}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">
          {errorMessage}
        </div>
      )}

      {allSubjects.length === 0 ? (
        <div className="text-gray-600">
          <p>No subjects available. Contact administrator to add subjects.</p>
          <p className="text-sm mt-2">Common subjects include: Mathematics, English, Science, History, etc.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {allSubjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => toggleSubject(subject.id)}
                className={`px-4 py-3 rounded-lg border-2 text-sm transition-colors ${
                  selectedSubjects.includes(subject.id)
                    ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {subject.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Saving...' : 'Save Subjects'}
          </button>
        </>
      )}

      {tutorSubjects.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Your Selected Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {tutorSubjects.map((ts) => (
              <span
                key={ts.id}
                className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm"
              >
                {ts.subject.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> If you don't see a subject you teach, please contact support to have it added to the system.
        </p>
      </div>
    </div>
  )
}

export default Subjects

