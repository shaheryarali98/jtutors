import { useEffect, useState } from 'react'
import api from '../../lib/api'

interface Subject {
  id: string
  name: string
  parentId?: string | null
  children?: Subject[]
}

interface TutorSubject {
  id: string
  subjectId: string
  subject: Subject
}

const Subjects = () => {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [categories, setCategories] = useState<Subject[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
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
      const all = response.data.subjects || []
      setAllSubjects(all)
      
      // Filter to get only categories (subjects with no parent)
      const cats = all.filter((s: Subject) => !s.parentId)
      setCategories(cats)
      
      console.log('Fetched subjects:', all)
      console.log('Categories:', cats)
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setErrorMessage('Failed to load subjects. Please refresh the page.')
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

  const getSubcategories = (categoryId: string) => {
    // First check if category has children in the response
    const category = allSubjects.find(s => s.id === categoryId)
    if (category?.children && category.children.length > 0) {
      return category.children
    }
    // Otherwise, filter all subjects by parentId
    const subs = allSubjects.filter(s => s.parentId === categoryId)
    console.log(`Subcategories for ${category?.name}:`, subs)
    return subs
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

  const subcategories = selectedCategory ? getSubcategories(selectedCategory) : []

  return (
    <div>
      <h2 className="section-title">Subjects I Can Teach</h2>
      <p className="text-gray-600 mb-6">Please select a category first, then choose the specific subjects you can teach.</p>

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

      {categories.length === 0 ? (
        <div className="text-gray-600 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium mb-2">No subject categories available.</p>
          <p className="text-sm">Please contact the administrator to set up subject categories and subcategories.</p>
        </div>
      ) : (
        <>
          {!selectedCategory ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Select a Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className="px-4 py-3 rounded-lg border-2 border-gray-300 hover:border-primary-400 text-sm transition-colors"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  ← Back to Categories
                </button>
                <h3 className="text-lg font-semibold">
                  {categories.find(c => c.id === selectedCategory)?.name} - Select Subjects
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {subcategories.map((subject) => (
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
              {subcategories.length === 0 && (
                <div className="text-gray-600 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium mb-2">No subcategories available for this category yet.</p>
                  <p className="text-sm">Please contact the administrator to add subcategories for "{categories.find(c => c.id === selectedCategory)?.name}".</p>
                </div>
              )}
            </div>
          )}

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
