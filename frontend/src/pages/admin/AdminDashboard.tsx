import { useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../lib/api'
import { UserRole } from '../../store/authStore'

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
  googleClassroomLink?: string
  googleMeetLink?: string
  status: string
  tutorApproved: boolean
  adminApproved: boolean
  completedAt?: string
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

type Tab = 'overview' | 'users' | 'settings' | 'withdrawals' | 'classes' | 'emails'

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [analytics, setAnalytics] = useState<AnalyticsPayload['analytics'] | null>(null)
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [classSessions, setClassSessions] = useState<ClassSession[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [analyticsRes, settingsRes, usersRes] = await Promise.all([
          api.get<AnalyticsPayload>('/admin/analytics'),
          api.get<{ settings: AdminSettings }>('/admin/settings'),
          api.get<{ users: AdminUser[] }>('/admin/users')
        ])
        setAnalytics(analyticsRes.data.analytics)
        setSettings(settingsRes.data.settings)
        setUsers(usersRes.data.users)
      } catch (err) {
        console.error('Error loading admin dashboard:', err)
        setError('Unable to load admin data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (activeTab === 'withdrawals') {
      loadWithdrawals()
    } else if (activeTab === 'classes') {
      loadClassSessions()
    } else if (activeTab === 'emails') {
      loadEmailTemplates()
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

  const totalsCards = useMemo(
    () => analytics && [
      { label: 'Total Users', value: analytics.totals.users, accent: 'from-violet-500 to-indigo-500' },
      { label: 'Tutors', value: analytics.totals.tutors, accent: 'from-emerald-500 to-teal-500' },
      { label: 'Students', value: analytics.totals.students, accent: 'from-sky-500 to-cyan-500' },
      { label: 'Bookings', value: analytics.totals.bookings, accent: 'from-amber-500 to-orange-500' }
    ],
    [analytics]
  )

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
      setError('Failed to approve class.')
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'settings', label: 'Settings' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'classes', label: 'Classes' },
    { id: 'emails', label: 'Email Templates' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Control Center</h1>
          <p className="text-slate-600 mt-1">Monitor analytics, manage users, and fine-tune JTutor platform settings.</p>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-3xl shadow mb-6">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">
            Loading dashboard…
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && analytics && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {totalsCards?.map((card) => (
                    <div key={card.label} className="rounded-2xl p-[1px] bg-gradient-to-br from-slate-200 to-slate-100">
                      <div className="bg-white rounded-[21px] p-5 shadow-sm h-full flex flex-col">
                        <span className="text-sm text-slate-500">{card.label}</span>
                        <span className="text-3xl font-bold text-slate-900 mt-2">{card.value}</span>
                        <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${card.accent}`}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl shadow p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Tutor Profile Health</h3>
                    <p className="text-sm text-slate-500 mt-2">Average completion across all tutor profiles</p>
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

                  <div className="bg-white rounded-3xl shadow p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Popular Subjects</h3>
                    <p className="text-sm text-slate-500 mt-2">Top subjects tutors are offering</p>
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
              </div>
            )}

            {/* Users Tab */}
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
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-6">No users found.</div>
                  )}
                </div>
              </section>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && settings && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">Platform Settings</h2>
                  <p className="text-sm text-slate-500">Control platform behavior and commission rates.</p>
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
                            onChange={(e) =>
                              handleUpdateSettings({ adminCommissionPercentage: parseFloat(e.target.value) })
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
                            onChange={(e) =>
                              handleUpdateSettings({ adminCommissionFixed: parseFloat(e.target.value) })
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
                          <strong>Current Commission:</strong> {settings.adminCommissionPercentage}% + ${settings.adminCommissionFixed.toFixed(2)}
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
                          onChange={(e) =>
                            handleUpdateSettings({
                              withdrawalAutoApproveDays: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          disabled={savingSettings}
                          className="input w-32"
                          placeholder="Manual"
                        />
                        <span className="text-sm text-slate-500">days (leave empty for manual approval)</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Withdrawals will be automatically approved after this many days. Set to empty for manual approval only.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Withdrawals Tab */}
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
                    </tbody>
                  </table>
                  {withdrawals.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-6">No withdrawals found.</div>
                  )}
                </div>
              </section>
            )}

            {/* Classes Tab */}
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
                          <td className="px-4 py-3">
                            {session.booking?.student?.user?.email || 'Unknown'}
                          </td>
                          <td className="px-4 py-3">
                            {session.booking?.tutor?.user?.email || 'Unknown'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                session.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : session.status === 'SCHEDULED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {session.status}
                            </span>
                          </td>
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
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 ml-2"
                              >
                                View Class
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {classSessions.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-6">No class sessions found.</div>
                  )}
                </div>
              </section>
            )}

            {/* Email Templates Tab */}
            {activeTab === 'emails' && (
              <section className="bg-white rounded-3xl shadow p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Email Templates</h2>
                    <p className="text-sm text-slate-500">Customize email templates sent to users.</p>
                  </div>
                  <button
                    onClick={() => api.post('/email-templates/initialize')}
                    className="btn btn-primary text-sm"
                  >
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
                      <div
                        key={template.id}
                        className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50"
                      >
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
          </>
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
          className={`block w-11 h-6 rounded-full transition-colors ${
            value ? 'bg-primary-500' : 'bg-slate-300'
          }`}
        ></span>
        <span
          className={`dot absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition ${
            value ? 'translate-x-5' : ''
          }`}
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
  const [name, setName] = useState(template.name)
  const [subject, setSubject] = useState(template.subject)
  const [htmlBody, setHtmlBody] = useState(template.htmlBody)
  const [textBody, setTextBody] = useState(template.textBody)
  const [isActive, setIsActive] = useState(template.isActive)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Template Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input w-full"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input w-full"
        />
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
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-sm text-slate-700">Active</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ name, subject, htmlBody, textBody, isActive })}
          className="btn btn-primary"
        >
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
