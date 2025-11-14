import { useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../lib/api'
import { UserRole } from '../../store/authStore'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react'

interface AnalyticsPayload {
  analytics: {
    totals: {
      users: number
      tutors: number
      students: number
      bookings: number
    }
    averages: {
      tutorProfileCompletion: number
    }
    trends: {
      newSignupsLast7Days: number
    }
    popularSubjects: Array<{
      subjectId: string
      subjectName: string
      tutorCount: number
    }>
  }
}

interface AdminSettings {
  id: string
  sendSignupConfirmation: boolean
  sendProfileCompletionEmail: boolean
  adminCommissionPercentage: number
  adminCommissionFixed: number
  withdrawalAutoApproveDays: number | null
}

interface AdminUser {
  id: string
  email: string
  role: UserRole
  createdAt: string
  emailConfirmed?: boolean
  tutor?: { id: string | null }
  student?: { id: string | null }
}

interface Withdrawal {
  id: string
  userId: string
  userType: string
  amount: number
  currency: string
  status: string
  requestedAt: string
  approvedAt?: string
  user?: { id: string; email: string; role: string }
}

interface ClassSession {
  id: string
  bookingId: string
  googleClassroomLink?: string | null
  googleMeetLink?: string | null
  status: string
  tutorApproved: boolean
  adminApproved: boolean
  completedAt?: string | null
  booking?: {
    student?: { user?: { email: string } }
    tutor?: { user?: { email: string } }
  }
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlBody: string
  textBody: string
  isActive: boolean
  variables?: string
}

interface AdminBooking {
  id: string
  status: string
  startTime: string
  endTime: string
  createdAt: string
  studentEmail: string | null
  tutorEmail: string | null
  payment: {
    id: string
    amount: number
    currency: string
    paymentStatus: string
    paidAt?: string | null
  } | null
  classSession: {
    id: string
    status: string
    googleClassroomLink?: string | null
    googleMeetLink?: string | null
  } | null
}

interface AdminPayment {
  id: string
  bookingId: string
  amount: number
  currency: string
  paymentStatus: string
  paidAt?: string | null
  createdAt: string
  studentEmail: string | null
  tutorEmail: string | null
}

interface SubjectItem {
  id: string
  name: string
}

interface GoogleStatus {
  configured: boolean
  missingKeys: string[]
  redirectUri: string
}

type AdminTab =
  | 'overview'
  | 'hires'
  | 'users'
  | 'subjects'
  | 'settings'
  | 'withdrawals'
  | 'classes'
  | 'emails'
  | 'integrations'

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [analytics, setAnalytics] = useState<AnalyticsPayload['analytics'] | null>(null)
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [classSessions, setClassSessions] = useState<ClassSession[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)

  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)

  const [error, setError] = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [subjectEditingId, setSubjectEditingId] = useState<string | null>(null)
  const [subjectEditingName, setSubjectEditingName] = useState('')

  useEffect(() => {
    const loadCore = async () => {
      try {
        setLoading(true)
        setError('')
        const [analyticsRes, settingsRes, usersRes, bookingsRes, paymentsRes, subjectsRes] = await Promise.all([
          api.get<AnalyticsPayload>('/admin/analytics'),
          api.get<{ settings: AdminSettings }>('/admin/settings'),
          api.get<{ users: AdminUser[] }>('/admin/users'),
          api.get<{ bookings: AdminBooking[] }>('/admin/bookings'),
          api.get<{ payments: AdminPayment[] }>('/admin/payments'),
          api.get<{ subjects: SubjectItem[] }>('/subjects'),
        ])

        setAnalytics(analyticsRes.data.analytics)
        setSettings(settingsRes.data.settings)
        setUsers(usersRes.data.users)
        setBookings(bookingsRes.data.bookings)
        setPayments(paymentsRes.data.payments)
        setSubjects(subjectsRes.data.subjects)
      } catch (err) {
        console.error('Error loading admin dashboard:', err)
        setError('Unable to load admin data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadCore()
  }, [])

  useEffect(() => {
    if (activeTab === 'withdrawals') {
      loadWithdrawals()
    } else if (activeTab === 'classes') {
      loadClassSessions()
    } else if (activeTab === 'emails') {
      loadEmailTemplates()
    } else if (activeTab === 'subjects' && subjects.length === 0) {
      loadSubjects()
    } else if (activeTab === 'integrations') {
      loadGoogleStatus()
    } else if (activeTab === 'hires') {
      loadHires()
    }
  }, [activeTab])

  const loadWithdrawals = async () => {
    try {
      const res = await api.get<{ withdrawals: Withdrawal[] }>('/withdrawals/all')
      setWithdrawals(res.data.withdrawals)
    } catch (err) {
      console.error('Error loading withdrawals:', err)
    }
  }

  const loadClassSessions = async () => {
    try {
      const res = await api.get<{ classSessions: ClassSession[] }>('/class-sessions/all')
      setClassSessions(res.data.classSessions)
    } catch (err) {
      console.error('Error loading class sessions:', err)
    }
  }

  const loadEmailTemplates = async () => {
    try {
      const res = await api.get<{ templates: EmailTemplate[] }>('/email-templates')
      setEmailTemplates(res.data.templates)
    } catch (err) {
      console.error('Error loading email templates:', err)
    }
  }

  const loadHires = async () => {
    try {
      const [bookingsRes, paymentsRes] = await Promise.all([
        api.get<{ bookings: AdminBooking[] }>('/admin/bookings'),
        api.get<{ payments: AdminPayment[] }>('/admin/payments'),
      ])
      setBookings(bookingsRes.data.bookings)
      setPayments(paymentsRes.data.payments)
    } catch (err) {
      console.error('Error loading hires data:', err)
      setError('Unable to refresh hires data. Please try again.')
    }
  }

  const loadSubjects = async () => {
    try {
      const res = await api.get<{ subjects: SubjectItem[] }>('/subjects')
      setSubjects(res.data.subjects)
    } catch (err) {
      console.error('Error loading subjects:', err)
      setError('Unable to load subjects. Please try again.')
    }
  }

  const loadGoogleStatus = async () => {
    try {
      const res = await api.get<{ status: GoogleStatus }>('/admin/integrations/google-classroom/status')
      setGoogleStatus(res.data.status)
    } catch (err) {
      console.error('Error loading Google status:', err)
      setError('Unable to check Google Classroom status.')
    }
  }

  const handleUpdateSettings = async (updates: Partial<AdminSettings>) => {
    if (!settings) return
    try {
      setSavingSettings(true)
      const response = await api.patch<{ settings: AdminSettings }>('/admin/settings', updates)
      setSettings(response.data.settings)
    } catch (err) {
      console.error('Error updating settings:', err)
      setError('Failed to update settings. Please try again.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleToggleSetting = async (key: keyof Omit<AdminSettings, 'id'>, value: boolean) => {
    await handleUpdateSettings({ [key]: value } as Partial<AdminSettings>)
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      setUpdatingUserId(userId)
      const response = await api.patch<{ user: AdminUser }>(`/admin/users/${userId}`, { role })
      setUsers((prev) => prev.map((u) => (u.id === userId ? response.data.user : u)))
    } catch (err) {
      console.error('Error updating user role:', err)
      setError('Unable to update user role.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleEmailConfirmationToggle = async (userId: string, emailConfirmed: boolean) => {
    try {
      setUpdatingUserId(userId)
      const response = await api.patch<{ user: AdminUser }>(`/admin/users/${userId}`, { emailConfirmed })
      setUsers((prev) => prev.map((u) => (u.id === userId ? response.data.user : u)))
    } catch (err) {
      console.error('Error updating email confirmation:', err)
      setError('Unable to update email confirmation.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      setUpdatingUserId(userId)
      await api.delete(`/admin/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      console.error('Error deleting user:', err)
      setError('Unable to delete user.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await api.post(`/withdrawals/${id}/approve`, {})
      await loadWithdrawals()
    } catch (err) {
      console.error('Error approving withdrawal:', err)
      setError('Failed to approve withdrawal.')
    }
  }

  const handleRejectWithdrawal = async (id: string, reason: string) => {
    try {
      await api.post(`/withdrawals/${id}/reject`, { reason })
      await loadWithdrawals()
    } catch (err) {
      console.error('Error rejecting withdrawal:', err)
      setError('Failed to reject withdrawal.')
    }
  }

  const handleApproveClass = async (id: string) => {
    try {
      await api.post(`/class-sessions/${id}/approve`, {})
      await loadClassSessions()
    } catch (err) {
      console.error('Error approving class:', err)
      setError('Failed to approve class session.')
    }
  }

  const handleSaveEmailTemplate = async (template: Partial<EmailTemplate>) => {
    try {
      if (editingTemplate) {
        await api.put(`/email-templates/${editingTemplate.name}`, template)
      } else {
        await api.post('/email-templates', template)
      }
      setEditingTemplate(null)
      await loadEmailTemplates()
    } catch (err) {
      console.error('Error saving email template:', err)
      setError('Failed to save email template.')
    }
  }

  const handleBookingStatusChange = async (bookingId: string, status: string) => {
    try {
      await api.patch(`/admin/bookings/${bookingId}`, { status })
      await loadHires()
    } catch (err) {
      console.error('Error updating booking status:', err)
      setError('Failed to update booking status.')
    }
  }

  const handleCreateGoogleClassroom = async (bookingId: string) => {
    try {
      await api.post(`/admin/bookings/${bookingId}/google-classroom`, {})
      await loadHires()
      setError('')
    } catch (err: any) {
      console.error('Error creating Google Classroom:', err)
      setError(err.response?.data?.error || 'Google Classroom provisioning failed.')
    }
  }

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      await api.post(`/admin/payments/${paymentId}/confirm`, {})
      await loadHires()
    } catch (err) {
      console.error('Error confirming payment:', err)
      setError('Failed to confirm payment.')
    }
  }

  const handleRefundPayment = async (paymentId: string) => {
    if (!confirm('Mark this payment as refunded?')) return
    try {
      await api.post(`/admin/payments/${paymentId}/refund`, {})
      await loadHires()
    } catch (err) {
      console.error('Error refunding payment:', err)
      setError('Failed to update payment status.')
    }
  }

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return
    try {
      const response = await api.post('/subjects', { name: newSubjectName.trim() })
      setSubjects((prev) => [...prev, response.data.subject])
      setNewSubjectName('')
    } catch (err: any) {
      console.error('Error creating subject:', err)
      setError(err.response?.data?.error || 'Unable to create subject.')
    }
  }

  const handleUpdateSubject = async (subjectId: string) => {
    if (!subjectEditingName.trim()) return
    try {
      const response = await api.patch(`/subjects/${subjectId}`, { name: subjectEditingName.trim() })
      setSubjects((prev) => prev.map((s) => (s.id === subjectId ? response.data.subject : s)))
      setSubjectEditingId(null)
      setSubjectEditingName('')
    } catch (err: any) {
      console.error('Error updating subject:', err)
      setError(err.response?.data?.error || 'Unable to update subject.')
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Delete this subject? This cannot be undone.')) return
    try {
      await api.delete(`/subjects/${subjectId}`)
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
    } catch (err: any) {
      console.error('Error deleting subject:', err)
      setError(err.response?.data?.error || 'Unable to delete subject.')
    }
  }

  const pendingHires = useMemo(() => bookings.filter((b) => b.status === 'PENDING').length, [bookings])
  const pendingPayments = useMemo(
    () => payments.filter((p) => p.paymentStatus === 'PENDING').length,
    [payments]
  )

  const tabs: { id: AdminTab; label: string; description: string }[] = [
    { id: 'overview', label: 'Overview', description: 'Snapshot of platform health' },
    { id: 'hires', label: 'Hires & Payments', description: 'Manage tutor engagements and Stripe payments' },
    { id: 'users', label: 'Users', description: 'Roles, verification, and account controls' },
    { id: 'subjects', label: 'Subjects & Topics', description: 'Curate the tutoring catalogue' },
    { id: 'settings', label: 'Platform Settings', description: 'Email, commission, and withdrawal rules' },
    { id: 'withdrawals', label: 'Withdrawals', description: 'Approve tutor and admin payouts' },
    { id: 'classes', label: 'Class Sessions', description: 'Monitor class approvals and Google links' },
    { id: 'emails', label: 'Email Templates', description: 'Automated communication templates' },
    { id: 'integrations', label: 'Integrations', description: 'Google Classroom connection status' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Control Center</h1>
          <p className="text-slate-600 mt-1">
            Monitor analytics, manage users, and fine-tune JTutors platform settings.
          </p>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow mb-6">
          <div className="flex flex-wrap border-b border-slate-200 text-sm font-medium">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-3 transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className="text-xs font-normal text-slate-400 hidden sm:block">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">
            Loading dashboard…
          </div>
        ) : (
          <div className="space-y-8">
            {activeTab === 'overview' && analytics && (
              <section className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Total Users', value: analytics.totals.users },
                    { label: 'Tutors', value: analytics.totals.tutors },
                    { label: 'Students', value: analytics.totals.students },
                    { label: 'Bookings', value: analytics.totals.bookings },
                  ].map((card) => (
                    <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">{card.label}</div>
                      <div className="mt-3 text-3xl font-bold text-slate-900">{card.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Tutor Profile Health</h3>
                    <p className="text-sm text-slate-500 mt-2">
                      Average completion across all tutor profiles.
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                        <span>Profile completion</span>
                        <span className="font-semibold text-primary-600">
                          {analytics.averages.tutorProfileCompletion.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${analytics.averages.tutorProfileCompletion}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Popular Subjects</h3>
                    <p className="text-sm text-slate-500 mt-2">Top subjects tutors are offering right now.</p>
                    <ul className="mt-4 space-y-3">
                      {analytics.popularSubjects.map((subject) => (
                        <li key={subject.subjectId} className="flex items-center justify-between">
                          <span className="text-slate-700 font-medium">{subject.subjectName}</span>
                          <span className="text-sm text-slate-500">{subject.tutorCount} tutors</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Hires requiring attention</h3>
                    <p className="text-sm text-slate-500 mt-2">
                      Pending hires and payments awaiting approval.
                    </p>
                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-2xl bg-slate-100 px-4 py-3">
                        <dt className="text-slate-500">Pending hire requests</dt>
                        <dd className="text-2xl font-bold text-slate-900">{pendingHires}</dd>
              </div>
                      <div className="rounded-2xl bg-slate-100 px-4 py-3">
                        <dt className="text-slate-500">Pending payments</dt>
                        <dd className="text-2xl font-bold text-slate-900">{pendingPayments}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">New signups</h3>
                    <p className="text-sm text-slate-500 mt-2">
                      {analytics.trends.newSignupsLast7Days} new accounts created in the last 7 days.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'hires' && (
              <section className="space-y-8">
                <div className="bg-white rounded-3xl shadow p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">Hire Requests</h2>
                    <p className="text-sm text-slate-500">Update statuses and connect Google Classroom resources.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Tutor</th>
                          <th className="px-4 py-3">Schedule</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Google Classroom</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 text-slate-600">{booking.studentEmail || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{booking.tutorEmail || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">
                              <div>{new Date(booking.startTime).toLocaleString()}</div>
                              <div className="text-xs text-slate-400">
                                ends {new Date(booking.endTime).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={booking.status}
                                onChange={(event) => handleBookingStatusChange(booking.id, event.target.value)}
                                className="input text-sm"
                              >
                                {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {booking.classSession?.googleClassroomLink ? (
                                <div className="flex flex-col gap-1">
                                  <a
                                    href={booking.classSession.googleClassroomLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
                                  >
                                    Classroom <ExternalLink className="h-3 w-3" />
                                  </a>
                                  {booking.classSession.googleMeetLink && (
                                    <a
                                      href={booking.classSession.googleMeetLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                                    >
                                      Meet link
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleCreateGoogleClassroom(booking.id)}
                                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                                >
                                  Create Classroom
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              <div className="text-xs uppercase tracking-wide text-slate-400">Payment</div>
                              {booking.payment ? (
                                <div className="mt-1 text-sm">
                                  <div>{booking.payment.paymentStatus}</div>
                                  <div className="text-slate-500">
                                    ${booking.payment.amount.toFixed(2)} {booking.payment.currency}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-400">Not invoiced</div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {bookings.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm">
                              No hire requests found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">Payments</h2>
                    <p className="text-sm text-slate-500">Review and confirm Stripe charges collected from students.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Tutor</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Updated</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 text-slate-600">{payment.studentEmail || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{payment.tutorEmail || '—'}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              ${payment.amount.toFixed(2)} {payment.currency}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{payment.paymentStatus}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-3 text-sm">
                                {payment.paymentStatus === 'PENDING' && (
                                  <button
                                    onClick={() => handleConfirmPayment(payment.id)}
                                    className="font-semibold text-green-600 hover:text-green-700"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {payment.paymentStatus === 'PAID' && (
                                  <button
                                    onClick={() => handleRefundPayment(payment.id)}
                                    className="font-semibold text-red-600 hover:text-red-700"
                                  >
                                    Mark refunded
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {payments.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm">
                              No payments found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'users' && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">User Directory</h2>
                  <p className="text-sm text-slate-500">Manage roles, confirmation status, and remove accounts.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Email Confirmed</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{user.email}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide">
                              {user.tutor ? 'Tutor profile' : user.student ? 'Student profile' : 'No profile yet'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={user.role}
                              onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}
                              disabled={updatingUserId === user.id}
                              className="input text-sm"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="TUTOR">Tutor</option>
                              <option value="STUDENT">Student</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                checked={Boolean(user.emailConfirmed)}
                                onChange={(event) =>
                                  handleEmailConfirmationToggle(user.id, event.target.checked)
                                }
                                disabled={updatingUserId === user.id}
                              />
                              {user.emailConfirmed ? 'Confirmed' : 'Pending'}
                            </label>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-sm font-semibold text-red-500 hover:text-red-600"
                              disabled={updatingUserId === user.id}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500 text-sm">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'subjects' && (
              <section className="bg-white rounded-3xl shadow p-6 space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Subjects & Topics</h2>
                    <p className="text-sm text-slate-500">
                      Curate the catalogue students can browse when hiring tutors.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(event) => setNewSubjectName(event.target.value)}
                      placeholder="Add new subject"
                      className="input"
                    />
                    <button
                      onClick={handleCreateSubject}
                      className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      {subjectEditingId === subject.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={subjectEditingName}
                            onChange={(event) => setSubjectEditingName(event.target.value)}
                            className="input"
                          />
                          <div className="flex gap-2 text-sm">
                            <button
                              onClick={() => handleUpdateSubject(subject.id)}
                              className="flex-1 rounded-full bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setSubjectEditingId(null)
                                setSubjectEditingName('')
                              }}
                              className="flex-1 rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{subject.name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSubjectEditingId(subject.id)
                                setSubjectEditingName(subject.name)
                              }}
                              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="text-sm font-semibold text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {subjects.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                      No subjects yet. Add your first subject to build the catalogue.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'settings' && settings && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Platform Settings</h2>
                  <p className="text-sm text-slate-500">Control platform behaviour and commission rates.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Email Settings</h3>
                    <div className="space-y-5">
                      <SettingToggle
                        label="Send confirmation email after signup"
                        description="Automatically send a welcome email after a new account is created."
                        value={settings.sendSignupConfirmation}
                        onChange={(value) => handleToggleSetting('sendSignupConfirmation', value)}
                        disabled={savingSettings}
                      />
                      <SettingToggle
                        label="Notify users when profiles reach 100% completion"
                        description="Emails tutors and students when their profiles are fully complete."
                        value={settings.sendProfileCompletionEmail}
                        onChange={(value) => handleToggleSetting('sendProfileCompletionEmail', value)}
                        disabled={savingSettings}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Commission Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Admin Commission Percentage
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={settings.adminCommissionPercentage}
                            onChange={(event) =>
                              handleUpdateSettings({ adminCommissionPercentage: parseFloat(event.target.value) })
                            }
                            disabled={savingSettings}
                            className="input w-32"
                          />
                          <span className="text-sm text-slate-500">%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Percentage of each sale that goes to admin (e.g., 10.0%)
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Admin Commission Fixed Fee
                        </label>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={settings.adminCommissionFixed}
                            onChange={(event) =>
                              handleUpdateSettings({ adminCommissionFixed: parseFloat(event.target.value) })
                            }
                            disabled={savingSettings}
                            className="input w-32"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Fixed fee amount added to commission (e.g., $0.00)
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-sm text-slate-700">
                          <strong>Current Commission:</strong> {settings.adminCommissionPercentage}% + $
                          {settings.adminCommissionFixed.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Withdrawal Settings</h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Auto-Approve After Days
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min="0"
                          value={settings.withdrawalAutoApproveDays || ''}
                          onChange={(event) =>
                            handleUpdateSettings({
                              withdrawalAutoApproveDays: event.target.value
                                ? parseInt(event.target.value)
                                : null,
                            })
                          }
                          disabled={savingSettings}
                          className="input w-32"
                          placeholder="Manual"
                        />
                        <span className="text-sm text-slate-500">days (leave empty for manual approval)</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Withdrawals will be automatically approved after this many days. Set to empty for manual
                        approval only.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'withdrawals' && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Withdrawal Management</h2>
                  <p className="text-sm text-slate-500">Review and manage withdrawal requests from tutors and admins.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Requested</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {withdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{withdrawal.user?.email || 'Unknown'}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{withdrawal.userType}</td>
                          <td className="px-4 py-3 font-medium">
                            ${withdrawal.amount.toFixed(2)} {withdrawal.currency}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                withdrawal.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : withdrawal.status === 'APPROVED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : withdrawal.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {withdrawal.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(withdrawal.requestedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {withdrawal.status === 'PENDING' && (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                  className="text-sm font-semibold text-green-600 hover:text-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Rejection reason:')
                                    if (reason) handleRejectWithdrawal(withdrawal.id, reason)
                                  }}
                                  className="text-sm font-semibold text-red-600 hover:text-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  {withdrawals.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm">
                            No withdrawals found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'classes' && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Class Session Management</h2>
                  <p className="text-sm text-slate-500">Review and approve completed class sessions.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Tutor</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Tutor Approved</th>
                        <th className="px-4 py-3">Admin Approved</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-slate-600">
                            {session.booking?.student?.user?.email || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {session.booking?.tutor?.user?.email || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{session.status}</td>
                          <td className="px-4 py-3">
                            {session.tutorApproved ? (
                              <span className="text-green-600">✓ Yes</span>
                            ) : (
                              <span className="text-slate-400">✗ No</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {session.adminApproved ? (
                              <span className="text-green-600">✓ Yes</span>
                            ) : (
                              <span className="text-slate-400">✗ No</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {session.tutorApproved && !session.adminApproved && (
                              <button
                                onClick={() => handleApproveClass(session.id)}
                                className="text-sm font-semibold text-green-600 hover:text-green-700"
                              >
                                Approve
                              </button>
                            )}
                            {session.googleClassroomLink && (
                              <a
                                href={session.googleClassroomLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                              >
                                Classroom <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                  {classSessions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm">
                            No class sessions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'emails' && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Email Templates</h2>
                    <p className="text-sm text-slate-500">Customize email templates sent to users.</p>
                  </div>
                  <button onClick={() => api.post('/email-templates/initialize')} className="btn btn-primary text-sm">
                    Initialize Defaults
                  </button>
                </div>

                {editingTemplate ? (
                  <EmailTemplateEditor
                    template={editingTemplate}
                    onSave={handleSaveEmailTemplate}
                    onCancel={() => setEditingTemplate(null)}
                  />
                ) : (
                  <div className="space-y-4">
                    {emailTemplates.map((template) => (
                      <div key={template.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{template.name}</h3>
                            <p className="text-sm text-slate-500 mt-1">{template.subject}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                template.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {template.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => setEditingTemplate(template)}
                              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {emailTemplates.length === 0 && (
                      <div className="text-center text-slate-500 text-sm py-6">No email templates found.</div>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'integrations' && (
              <section className="bg-white rounded-3xl shadow p-6 space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Google Classroom Integration</h2>
                    <p className="text-sm text-slate-500">
                      Connect JTutors to Google Classroom to automatically provision courses and Meet links for sessions.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  {googleStatus?.configured ? (
                    <div className="flex items-start gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-semibold">Google Classroom is connected.</div>
                        <p className="text-sm text-slate-600">
                          Sessions can create Google Classroom courses automatically. Redirect URI:
                          <code className="ml-2 rounded bg-white px-2 py-1 text-xs text-slate-700">
                            {googleStatus.redirectUri}
                          </code>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 text-slate-700">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <div className="font-semibold">Google Classroom is not fully configured.</div>
                        <p className="text-sm text-slate-600">
                          Missing environment variables:{' '}
                          {googleStatus?.missingKeys.map((key) => (
                            <code key={key} className="ml-1 rounded bg-white px-2 py-1 text-xs text-slate-700">
                              {key}
                            </code>
                          ))}
                        </p>
                        <p className="text-sm text-slate-600 mt-2">
                          Add these values to your backend environment and restart the server. Redirect URI expected by
                          Google:{' '}
                          <code className="ml-1 rounded bg-white px-2 py-1 text-xs text-slate-700">
                            {googleStatus?.redirectUri}
                          </code>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Setup checklist</h3>
                  <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
                    <li>Create a Google Cloud project and enable the Classroom API.</li>
                    <li>Generate OAuth client credentials and noted client ID/secret.</li>
                    <li>Use OAuth Playground or your own consent screen to obtain a refresh token for an admin user.</li>
                    <li>
                      Add <code className="rounded bg-slate-100 px-2 py-1 text-xs">GOOGLE_CLIENT_ID</code>,{' '}
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs">GOOGLE_CLIENT_SECRET</code>, and{' '}
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs">GOOGLE_REFRESH_TOKEN</code> to the
                      backend environment.
                    </li>
                    <li>Restart the backend service and refresh this page to verify the connection.</li>
                  </ol>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

interface SettingToggleProps {
  label: string
  description: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

const SettingToggle = ({ label, description, value, onChange, disabled }: SettingToggleProps) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4 border-b border-slate-100 last:border-b-0">
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-xl">{description}</p>
    </div>
    <label className="inline-flex items-center cursor-pointer">
      <span className="mr-3 text-sm text-slate-500">{value ? 'On' : 'Off'}</span>
      <span className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span
          className={`block w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary-500' : 'bg-slate-300'}`}
        ></span>
        <span
          className={`dot absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition ${value ? 'translate-x-5' : ''}`}
        ></span>
      </span>
    </label>
  </div>
)

interface EmailTemplateEditorProps {
  template: EmailTemplate
  onSave: (template: Partial<EmailTemplate>) => void
  onCancel: () => void
}

const EmailTemplateEditor = ({ template, onSave, onCancel }: EmailTemplateEditorProps) => {
  const [name] = useState(template.name)
  const [subject, setSubject] = useState(template.subject)
  const [htmlBody, setHtmlBody] = useState(template.htmlBody)
  const [textBody, setTextBody] = useState(template.textBody)
  const [isActive, setIsActive] = useState(template.isActive)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Template Name</label>
        <input type="text" value={name} className="input w-full" disabled />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="input w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">HTML Body</label>
        <textarea
          value={htmlBody}
          onChange={(e) => setHtmlBody(e.target.value)}
          className="input w-full h-64"
          placeholder="Use {{variableName}} for template variables"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Text Body</label>
        <textarea
          value={textBody}
          onChange={(e) => setTextBody(e.target.value)}
          className="input w-full h-32"
          placeholder="Plain text version"
        />
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className="text-sm text-slate-700">Active</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ name, subject, htmlBody, textBody, isActive })} className="btn btn-primary">
          Save
        </button>
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default AdminDashboard
