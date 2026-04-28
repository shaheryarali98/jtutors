import { useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Globe,
  EyeOff,
  Archive,
  BookOpen,
  Video,
  Mail,
  ExternalLink,
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'

interface Enrollment {
  id: string
  student: { firstName: string | null; lastName: string | null; profileImage: string | null }
}

interface Course {
  id: string
  title: string
  description: string
  price: number
  schedule: string | null
  meetingLink: string | null
  meetingType: string | null
  maxStudents: number | null
  status: string
  createdAt: string
  _count: { enrollments: number }
  enrollments: Enrollment[]
}

const MEETING_TYPES = ['GOOGLE_MEET', 'GOOGLE_CLASSROOM', 'ZOOM', 'OTHER']

const emptyForm = {
  title: '',
  description: '',
  price: '',
  schedule: '',
  meetingLink: '',
  meetingType: 'GOOGLE_MEET',
  maxStudents: '',
}

const CourseManager = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [jtutorsEmail, setJtutorsEmail] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
    fetchJTutorsEmail()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const res = await api.get('/courses/my/list')
      setCourses(res.data.courses)
    } catch {
      setError('Could not load courses.')
    } finally {
      setLoading(false)
    }
  }

  const fetchJTutorsEmail = async () => {
    try {
      const res = await api.get('/tutor/jtutors-email')
      setJtutorsEmail(res.data.jtutorsEmail)
    } catch {}
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setError('')
    setShowForm(true)
  }

  const openEdit = (c: Course) => {
    setEditingId(c.id)
    setForm({
      title: c.title,
      description: c.description,
      price: String(c.price),
      schedule: c.schedule ?? '',
      meetingLink: c.meetingLink ?? '',
      meetingType: c.meetingType ?? 'GOOGLE_MEET',
      maxStudents: c.maxStudents ? String(c.maxStudents) : '',
    })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.price) {
      setError('Title, description, and price are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        schedule: form.schedule || undefined,
        meetingLink: form.meetingLink || undefined,
        meetingType: form.meetingType || undefined,
        maxStudents: form.maxStudents ? parseInt(form.maxStudents) : undefined,
      }
      if (editingId) {
        const res = await api.put(`/courses/${editingId}`, payload)
        // Preserve enrollments — API response doesn't re-include them
        setCourses((prev) => prev.map((c) => (c.id === editingId ? { ...res.data.course, enrollments: c.enrollments } : c)))
      } else {
        const res = await api.post('/courses', payload)
        // New course has no enrollments yet
        setCourses((prev) => [{ ...res.data.course, enrollments: [] }, ...prev])
      }
      setShowForm(false)
      setSuccess(editingId ? 'Course updated.' : 'Course created as DRAFT. Publish it when ready.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save course.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (course: Course, newStatus: string) => {
    try {
      const res = await api.put(`/courses/${course.id}`, { status: newStatus })
      // Preserve enrollments — API response doesn't re-include them
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...res.data.course, enrollments: c.enrollments } : c)))
      setSuccess(`Course ${newStatus.toLowerCase()}.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Could not update status.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course? Enrolled students will lose access.')) return
    try {
      await api.delete(`/courses/${id}`)
      setCourses((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Could not delete course.')
    }
  }

  const statusColor = (s: string) =>
    s === 'PUBLISHED' ? 'bg-green-100 text-green-700'
      : s === 'ARCHIVED' ? 'bg-gray-100 text-gray-500'
      : 'bg-yellow-100 text-yellow-700'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
            <p className="text-sm text-slate-500 mt-0.5">Create and manage courses for students to enroll in.</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#012c54] text-white font-semibold text-sm rounded-xl hover:bg-[#012c54]/90 transition-colors"
          >
            <Plus size={16} /> New Course
          </button>
        </div>

        {/* JTutors Email Banner */}
        {jtutorsEmail ? (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <Mail className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sky-900 text-sm">Your JTutors Email</p>
              <p className="text-sky-700 text-sm mt-0.5">
                Use <strong>{jtutorsEmail}</strong> to create Google Meet / Classroom sessions.
                This email is provisioned by JTutors and links your classes to the platform.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">JTutors Email Not Yet Assigned</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Contact JTutors admin to receive your @jtutors.com Google Workspace email.
                You will use it to create Google Meet and Classroom links for your courses.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {success && <div className="bg-green-50 border border-green-100 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">{success}</div>}
        {error && <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

        {/* Course Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-5">{editingId ? 'Edit Course' : 'Create Course'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Course Title *</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#012c54]/20"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. SAT Math Prep"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#012c54]/20 resize-none"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe what students will learn..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price (USD) *</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#012c54]/20"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="49.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Students</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#012c54]/20"
                      value={form.maxStudents}
                      onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Schedule</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#012c54]/20"
                    value={form.schedule}
                    onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                    placeholder="e.g. Tuesdays 6–8 PM EST"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Type</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#012c54]/20"
                    value={form.meetingType}
                    onChange={(e) => setForm((f) => ({ ...f, meetingType: e.target.value }))}
                  >
                    {MEETING_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Meeting Link
                    {jtutorsEmail && (
                      <span className="ml-2 text-xs text-sky-600 font-normal">
                        Create with {jtutorsEmail}
                      </span>
                    )}
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#012c54]/20"
                    value={form.meetingLink}
                    onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#012c54] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#012c54]/90 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Course'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Course List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-14 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No courses yet</h3>
            <p className="text-slate-500 text-sm mt-1">Create your first course to start accepting students.</p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#012c54] text-white font-semibold text-sm rounded-xl hover:bg-[#012c54]/90 transition-colors"
            >
              <Plus size={15} /> Create Course
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900 text-base">{course.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(course.status)}`}>
                        {course.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{course.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="font-semibold text-[#012c54]">${course.price}</span>
                      {course.schedule && <span>📅 {course.schedule}</span>}
                      <span className="flex items-center gap-1"><Users size={12} /> {course._count.enrollments} enrolled</span>
                      {course.meetingLink && (
                        <a href={course.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sky-600 hover:underline">
                          <Video size={12} /> Join Link <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {course.status === 'DRAFT' && (
                      <button
                        onClick={() => handleStatusChange(course, 'PUBLISHED')}
                        title="Publish course — make it visible to students"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors"
                      >
                        <Globe size={14} /> Publish
                      </button>
                    )}
                    {course.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleStatusChange(course, 'DRAFT')}
                        title="Unpublish — hide from students"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-xl hover:bg-amber-100 transition-colors"
                      >
                        <EyeOff size={14} /> Unpublish
                      </button>
                    )}
                    <button onClick={() => openEdit(course)} className="p-2 text-slate-400 hover:text-[#012c54] rounded-lg hover:bg-slate-50 transition-colors" title="Edit">
                      <Pencil size={16} />
                    </button>
                    {course.status !== 'ARCHIVED' && (
                      <button onClick={() => handleStatusChange(course, 'ARCHIVED')} title="Archive" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                        <Archive size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(course.id)} className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Enrolled students */}
                {course.enrollments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">Enrolled students</p>
                    <div className="flex flex-wrap gap-2">
                      {course.enrollments.map((e) => (
                        <span key={e.id} className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs">
                          {e.student.firstName} {e.student.lastName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default CourseManager
