import { useEffect, useState } from 'react'
import { Plus, X, Edit2, Trash2, Clock, DollarSign, BookOpen, GraduationCap } from 'lucide-react'
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
  updatedAt: string
}

const StudentTutorRequests = () => {
  const [requests, setRequests] = useState<TutorRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [statusMsg, setStatusMsg] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    grade: '',
    budgetMin: '',
    budgetMax: '',
    preferredSchedule: '',
    sessionType: '',
  })

  useEffect(() => {
    fetchRequests()
    fetchSubjects()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tutor-requests/my')
      setRequests(response.data)
    } catch (error) {
      console.error('Error fetching tutor requests:', error)
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

  const resetForm = () => {
    setForm({ title: '', description: '', subject: '', grade: '', budgetMin: '', budgetMax: '', preferredSchedule: '', sessionType: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/tutor-requests/${editingId}`, form)
        setStatusMsg('Request updated successfully')
      } else {
        await api.post('/tutor-requests', form)
        setStatusMsg('Request posted successfully')
      }
      resetForm()
      fetchRequests()
      setTimeout(() => setStatusMsg(''), 3000)
    } catch (error: any) {
      console.error('Error saving tutor request:', error)
      setStatusMsg(error.response?.data?.error || 'Failed to save request')
    }
  }

  const handleEdit = (req: TutorRequest) => {
    setForm({
      title: req.title,
      description: req.description,
      subject: req.subject || '',
      grade: req.grade || '',
      budgetMin: req.budgetMin?.toString() || '',
      budgetMax: req.budgetMax?.toString() || '',
      preferredSchedule: req.preferredSchedule || '',
      sessionType: req.sessionType || '',
    })
    setEditingId(req.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return
    try {
      await api.delete(`/tutor-requests/${id}`)
      setRequests((prev) => prev.filter((r) => r.id !== id))
      setStatusMsg('Request deleted')
      setTimeout(() => setStatusMsg(''), 3000)
    } catch (error) {
      console.error('Error deleting request:', error)
    }
  }

  const handleClose = async (id: string) => {
    try {
      await api.put(`/tutor-requests/${id}`, { status: 'CLOSED' })
      fetchRequests()
      setStatusMsg('Request closed')
      setTimeout(() => setStatusMsg(''), 3000)
    } catch (error) {
      console.error('Error closing request:', error)
    }
  }

  const grades = ['K-5', '6-8', '9-12', 'College', 'Adult']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#012c54]">Find a Tutor</h1>
            <p className="text-gray-500 text-sm mt-1">Post what you're looking for and let tutors come to you</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#012c54] text-white rounded-full text-sm font-semibold hover:bg-[#012c54]/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Post Request
          </button>
        </div>

        {statusMsg && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {statusMsg}
          </div>
        )}

        {/* Post Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-bold text-[#012c54]">
                  {editingId ? 'Edit Request' : 'Post a Tutor Request'}
                </h2>
                <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Need help with AP Calculus"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe what you need help with, your goals, and any preferences..."
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                    >
                      <option value="">Any subject</option>
                      {subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                    <select
                      value={form.grade}
                      onChange={(e) => setForm({ ...form, grade: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                    >
                      <option value="">Any level</option>
                      {grades.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Budget ($/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.budgetMin}
                      onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
                      placeholder="e.g., 20"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Budget ($/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.budgetMax}
                      onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
                      placeholder="e.g., 50"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Schedule</label>
                  <input
                    type="text"
                    value={form.preferredSchedule}
                    onChange={(e) => setForm({ ...form, preferredSchedule: e.target.value })}
                    placeholder="e.g., Weekday evenings, Weekend mornings"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                  <select
                    value={form.sessionType}
                    onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                  >
                    <option value="">No preference</option>
                    <option value="ONLINE">Online only</option>
                    <option value="IN_PERSON">In-person only</option>
                    <option value="EITHER">Either works</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#012c54] text-white text-sm font-semibold rounded-full hover:bg-[#012c54]/90 transition-colors"
                  >
                    {editingId ? 'Update' : 'Post Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading your requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="font-semibold text-gray-600 mb-2">No requests yet</h3>
            <p className="text-sm text-gray-400 mb-6">
              Post a tutor request describing what you're looking for and let tutors reach out to you.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2 bg-[#012c54] text-white text-sm font-semibold rounded-full hover:bg-[#012c54]/90 transition-colors"
            >
              Post Your First Request
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#012c54]">{req.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        req.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                        req.status === 'FULFILLED' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{req.description}</p>
                  </div>
                  {req.status === 'OPEN' && (
                    <div className="flex items-center gap-1 ml-4">
                      <button onClick={() => handleEdit(req)} className="p-1.5 hover:bg-gray-100 rounded-full" title="Edit">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button onClick={() => handleClose(req.id)} className="p-1.5 hover:bg-gray-100 rounded-full" title="Close">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(req.id)} className="p-1.5 hover:bg-red-50 rounded-full" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {req.subject && (
                    <span className="flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-1 rounded-full">
                      <BookOpen className="w-3 h-3" /> {req.subject}
                    </span>
                  )}
                  {req.grade && (
                    <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                      <GraduationCap className="w-3 h-3" /> {req.grade}
                    </span>
                  )}
                  {(req.budgetMin || req.budgetMax) && (
                    <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full">
                      <DollarSign className="w-3 h-3" />
                      {req.budgetMin && req.budgetMax
                        ? `$${req.budgetMin} - $${req.budgetMax}/hr`
                        : req.budgetMin ? `From $${req.budgetMin}/hr` : `Up to $${req.budgetMax}/hr`}
                    </span>
                  )}
                  {req.preferredSchedule && (
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" /> {req.preferredSchedule}
                    </span>
                  )}
                  {req.sessionType && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {req.sessionType === 'ONLINE' ? 'Online' : req.sessionType === 'IN_PERSON' ? 'In-person' : 'Online or In-person'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Posted {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default StudentTutorRequests
