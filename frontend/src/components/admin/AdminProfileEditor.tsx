import { useMemo, useState } from 'react'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import { LANGUAGE_OPTIONS } from '../../constants/options'
import { TUTOR_GRADE_OPTIONS } from '../../constants/grades'
import { Plus, Trash2, Save, X, Upload, Pencil } from 'lucide-react'

/* ── Shared types ── */

export interface AdminSubjectOption {
  id: string
  name: string
  parentId?: string | null
}

export interface EditableTutor {
  id: string
  firstName?: string | null
  lastName?: string | null
  gender?: string | null
  gradesCanTeach?: string[]
  hourlyFee?: number | null
  tagline?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  address?: string | null
  zipcode?: string | null
  timezone?: string | null
  languagesSpoken?: string[]
  profileImage?: string | null
  coverImage?: string | null
  jtutorsEmail?: string | null
  isAtLeast21Confirmed?: boolean
  experiences?: Array<{
    id: string; jobTitle: string; company: string; location: string;
    startDate: string; endDate?: string | null; isCurrent: boolean;
    teachingMode: string; description?: string | null;
  }>
  educations?: Array<{
    id: string; degreeTitle: string; university: string; location: string;
    startDate: string; endDate?: string | null; isOngoing: boolean;
  }>
  subjects?: Array<{ id: string; subject: { id: string; name: string } }>
  availabilities?: Array<{
    id: string; blockTitle: string; daysAvailable: string[];
    startTime: string; endTime: string; breakTime: number;
    sessionDuration: number; numberOfSlots: number;
  }>
}

export interface EditableStudent {
  id: string
  firstName?: string | null
  lastName?: string | null
  gender?: string | null
  grade?: string | null
  tagline?: string | null
  bio?: string | null
  introduction?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  address?: string | null
  zipcode?: string | null
  languagesSpoken?: string[]
  learningPreferences?: string[]
  profileImage?: string | null
}

const TIMEZONE_FALLBACK = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto',
  'America/Vancouver', 'America/Sao_Paulo', 'America/Mexico_City', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Moscow', 'Asia/Jerusalem',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland', 'Africa/Cairo', 'Africa/Johannesburg',
]

const TIMEZONES: string[] =
  typeof Intl !== 'undefined' && (Intl as any).supportedValuesOf
    ? (Intl as any).supportedValuesOf('timeZone')
    : TIMEZONE_FALLBACK

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TEACHING_MODES = ['Online', 'In-Person', 'Hybrid']
const LEARNING_PREFERENCES = ['public place', "Student's home", 'Online']
const STUDENT_GRADE_OPTIONS = [...TUTOR_GRADE_OPTIONS]

const toDateInput = (value?: string | null) => (value ? String(value).slice(0, 10) : '')

/* ── Small reusable form primitives ── */

const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</label>
    {children}
  </div>
)

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

const ChipToggle = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
      active
        ? 'border-primary-500 bg-primary-50 text-primary-700'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    }`}
  >
    {children}
  </button>
)

/** Multi-select chip list with support for values outside the preset options. */
const ChipMultiSelect = ({
  options,
  selected,
  onChange,
  allowCustom = false,
  customPlaceholder = 'Add another…',
}: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  allowCustom?: boolean
  customPlaceholder?: string
}) => {
  const [customValue, setCustomValue] = useState('')
  const extras = selected.filter((entry) => !options.includes(entry))

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value])

  const addCustom = () => {
    const value = customValue.trim()
    if (!value || selected.includes(value)) {
      setCustomValue('')
      return
    }
    onChange([...selected, value])
    setCustomValue('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ChipToggle key={option} active={selected.includes(option)} onClick={() => toggle(option)}>
            {option}
          </ChipToggle>
        ))}
        {extras.map((extra) => (
          <ChipToggle key={extra} active onClick={() => toggle(extra)}>
            {extra} ✕
          </ChipToggle>
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustom()
              }
            }}
            placeholder={customPlaceholder}
            className={`${inputClass} max-w-xs`}
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

/** Uploads an image and hands the resulting URL back to the caller. */
const ImageUploadControl = ({
  label,
  currentUrl,
  kind,
  onUploaded,
  aspect = 'square',
}: {
  label: string
  currentUrl?: string | null
  kind: 'profile' | 'cover'
  onUploaded: (url: string) => Promise<void> | void
  aspect?: 'square' | 'wide'
}) => {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const preview = resolveImageUrl(currentUrl)

  const handleFile = async (file: File) => {
    setBusy(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const uploadRes = await api.post(`/uploads/${kind}-image`, formData)
      const url: string | undefined = uploadRes.data?.url
      if (!url) throw new Error('Upload did not return a URL')
      await onUploaded(url)
      setMessage('Saved')
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-center gap-3">
        {preview ? (
          <img
            src={preview}
            alt=""
            className={`${aspect === 'wide' ? 'h-16 w-32' : 'h-16 w-16 rounded-full'} object-cover border border-slate-200 ${aspect === 'wide' ? 'rounded-lg' : ''}`}
          />
        ) : (
          <div
            className={`${aspect === 'wide' ? 'h-16 w-32 rounded-lg' : 'h-16 w-16 rounded-full'} bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400`}
          >
            None
          </div>
        )}
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          {busy ? 'Uploading…' : 'Upload & save'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.currentTarget.value = ''
              if (file) void handleFile(file)
            }}
          />
        </label>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </div>
  )
}

/* ── Tutor profile editor ── */

export const TutorProfileEditor = ({
  tutor,
  userEmail,
  subjects,
  onRefresh,
}: {
  tutor: EditableTutor
  userEmail: string
  subjects: AdminSubjectOption[]
  onRefresh: () => Promise<void>
}) => {
  const [form, setForm] = useState({
    email: userEmail,
    firstName: tutor.firstName ?? '',
    lastName: tutor.lastName ?? '',
    gender: tutor.gender ?? '',
    tagline: tutor.tagline ?? '',
    hourlyFee: tutor.hourlyFee != null ? String(tutor.hourlyFee) : '',
    timezone: tutor.timezone ?? '',
    country: tutor.country ?? '',
    state: tutor.state ?? '',
    city: tutor.city ?? '',
    address: tutor.address ?? '',
    zipcode: tutor.zipcode ?? '',
    jtutorsEmail: tutor.jtutorsEmail ?? '',
  })
  const [languages, setLanguages] = useState<string[]>(tutor.languagesSpoken ?? [])
  const [grades, setGrades] = useState<string[]>(tutor.gradesCanTeach ?? [])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [errorText, setErrorText] = useState('')

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setFeedback('')
    setErrorText('')
    try {
      await api.patch(`/admin/tutors/${tutor.id}/profile`, {
        email: form.email.trim(),
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender,
        tagline: form.tagline,
        hourlyFee: form.hourlyFee === '' ? null : form.hourlyFee,
        timezone: form.timezone,
        country: form.country,
        state: form.state,
        city: form.city,
        address: form.address,
        zipcode: form.zipcode,
        jtutorsEmail: form.jtutorsEmail,
        languagesSpoken: languages,
        gradesCanTeach: grades,
      })
      await onRefresh()
      setFeedback('Profile saved')
    } catch (err: any) {
      setErrorText(err?.response?.data?.error || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const saveImage = async (kind: 'profileImage' | 'coverImage', url: string) => {
    await api.patch(`/admin/tutors/${tutor.id}/profile`, { [kind]: url })
    await onRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Photos */}
      <div className="grid gap-6 sm:grid-cols-2">
        <ImageUploadControl
          label="Profile photo"
          currentUrl={tutor.profileImage}
          kind="profile"
          onUploaded={(url) => saveImage('profileImage', url)}
        />
        <ImageUploadControl
          label="Cover image"
          currentUrl={tutor.coverImage}
          kind="cover"
          aspect="wide"
          onUploaded={(url) => saveImage('coverImage', url)}
        />
      </div>

      {/* Identity + contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="First name">
          <input className={inputClass} value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
        </Field>
        <Field label="Last name">
          <input className={inputClass} value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
        </Field>
        <Field label="Account email">
          <input className={inputClass} value={form.email} onChange={(e) => setField('email', e.target.value)} />
        </Field>
        <Field label="Gender">
          <select className={inputClass} value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
            <option value="">Not set</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </Field>
        <Field label="Hourly fee (USD)">
          <input
            type="number"
            min={20}
            max={500}
            className={inputClass}
            value={form.hourlyFee}
            onChange={(e) => setField('hourlyFee', e.target.value)}
          />
        </Field>
        <Field label="JTutors email">
          <input className={inputClass} value={form.jtutorsEmail} onChange={(e) => setField('jtutorsEmail', e.target.value)} />
        </Field>
        <Field label="Tagline / short bio" className="md:col-span-3">
          <textarea
            rows={3}
            className={inputClass}
            value={form.tagline}
            onChange={(e) => setField('tagline', e.target.value)}
          />
        </Field>
      </div>

      {/* Languages */}
      <Field label="Languages spoken">
        <ChipMultiSelect
          options={LANGUAGE_OPTIONS}
          selected={languages}
          onChange={setLanguages}
          allowCustom
          customPlaceholder="Add another language…"
        />
      </Field>

      {/* Grades */}
      <Field label="Grades they can teach">
        <ChipMultiSelect options={TUTOR_GRADE_OPTIONS} selected={grades} onChange={setGrades} />
      </Field>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Address" className="md:col-span-3">
          <input className={inputClass} value={form.address} onChange={(e) => setField('address', e.target.value)} />
        </Field>
        <Field label="City">
          <input className={inputClass} value={form.city} onChange={(e) => setField('city', e.target.value)} />
        </Field>
        <Field label="State / Region">
          <input className={inputClass} value={form.state} onChange={(e) => setField('state', e.target.value)} />
        </Field>
        <Field label="Zipcode">
          <input className={inputClass} value={form.zipcode} onChange={(e) => setField('zipcode', e.target.value)} />
        </Field>
        <Field label="Country">
          <input className={inputClass} value={form.country} onChange={(e) => setField('country', e.target.value)} />
        </Field>
        <Field label="Timezone" className="md:col-span-2">
          <select className={inputClass} value={form.timezone} onChange={(e) => setField('timezone', e.target.value)}>
            <option value="">Not set</option>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#012c54] text-white text-sm font-medium hover:bg-[#012c54]/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save profile details'}
        </button>
        {feedback && <span className="text-sm text-green-600">{feedback}</span>}
        {errorText && <span className="text-sm text-red-600">{errorText}</span>}
      </div>

      <SubjectPicker tutorId={tutor.id} subjects={subjects} current={tutor.subjects ?? []} onRefresh={onRefresh} />
      <ExperienceEditor tutorId={tutor.id} experiences={tutor.experiences ?? []} onRefresh={onRefresh} />
      <EducationEditor tutorId={tutor.id} educations={tutor.educations ?? []} onRefresh={onRefresh} />
      <AvailabilityEditor tutorId={tutor.id} availabilities={tutor.availabilities ?? []} onRefresh={onRefresh} />
    </div>
  )
}

/* ── Subjects ── */

const SubjectPicker = ({
  tutorId,
  subjects,
  current,
  onRefresh,
}: {
  tutorId: string
  subjects: AdminSubjectOption[]
  current: Array<{ id: string; subject: { id: string; name: string } }>
  onRefresh: () => Promise<void>
}) => {
  const [selected, setSelected] = useState<string[]>(current.map((entry) => entry.subject.id))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const categories = subjects.filter((subject) => !subject.parentId)
    const term = query.trim().toLowerCase()
    return categories
      .map((category) => ({
        category,
        children: subjects.filter(
          (subject) =>
            subject.parentId === category.id &&
            (!term || subject.name.toLowerCase().includes(term))
        ),
      }))
      .filter((group) => group.children.length > 0)
  }, [subjects, query])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))

  const handleSave = async () => {
    setSaving(true)
    setFeedback('')
    try {
      await api.put(`/admin/tutors/${tutorId}/subjects`, { subjectIds: selected })
      await onRefresh()
      setFeedback('Subjects saved')
    } catch (err: any) {
      setFeedback(err?.response?.data?.error || 'Failed to save subjects')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold text-slate-900">Subjects ({selected.length} selected)</h4>
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="Filter subjects…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
        {grouped.map(({ category, children }) => (
          <div key={category.id}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{category.name}</p>
            <div className="flex flex-wrap gap-2">
              {children.map((subject) => (
                <ChipToggle key={subject.id} active={selected.includes(subject.id)} onClick={() => toggle(subject.id)}>
                  {subject.name}
                </ChipToggle>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && <p className="text-sm text-slate-400">No subjects match that filter.</p>}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#012c54] text-white text-xs font-medium hover:bg-[#012c54]/90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save subjects'}
        </button>
        {feedback && <span className="text-xs text-slate-500">{feedback}</span>}
      </div>
    </div>
  )
}

/* ── Experience ── */

type ExperienceDraft = {
  jobTitle: string; company: string; location: string; startDate: string;
  endDate: string; isCurrent: boolean; teachingMode: string; description: string;
}

const emptyExperience: ExperienceDraft = {
  jobTitle: '', company: '', location: '', startDate: '',
  endDate: '', isCurrent: false, teachingMode: 'Online', description: '',
}

const ExperienceEditor = ({
  tutorId,
  experiences,
  onRefresh,
}: {
  tutorId: string
  experiences: NonNullable<EditableTutor['experiences']>
  onRefresh: () => Promise<void>
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ExperienceDraft>(emptyExperience)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const startAdd = () => {
    setEditingId('new')
    setDraft(emptyExperience)
    setFeedback('')
  }

  const startEdit = (item: NonNullable<EditableTutor['experiences']>[number]) => {
    setEditingId(item.id)
    setFeedback('')
    setDraft({
      jobTitle: item.jobTitle,
      company: item.company,
      location: item.location,
      startDate: toDateInput(item.startDate),
      endDate: toDateInput(item.endDate),
      isCurrent: item.isCurrent,
      teachingMode: item.teachingMode,
      description: item.description ?? '',
    })
  }

  const handleSave = async () => {
    setBusy(true)
    setFeedback('')
    try {
      if (editingId === 'new') {
        await api.post(`/admin/tutors/${tutorId}/experiences`, draft)
      } else {
        await api.patch(`/admin/tutors/${tutorId}/experiences/${editingId}`, draft)
      }
      await onRefresh()
      setEditingId(null)
    } catch (err: any) {
      setFeedback(err?.response?.data?.error || 'Failed to save experience')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this experience entry?')) return
    setBusy(true)
    try {
      await api.delete(`/admin/tutors/${tutorId}/experiences/${id}`)
      await onRefresh()
    } catch (err: any) {
      setFeedback(err?.response?.data?.error || 'Failed to delete experience')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900">Experience ({experiences.length})</h4>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="space-y-2">
        {experiences.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 border border-slate-200 rounded-xl p-3 bg-white">
            <div>
              <div className="text-sm font-semibold text-slate-900">{item.jobTitle}</div>
              <div className="text-xs text-slate-600">{item.company} · {item.location} · {item.teachingMode}</div>
              <div className="text-xs text-slate-400">
                {toDateInput(item.startDate)} – {item.isCurrent ? 'Present' : toDateInput(item.endDate) || '—'}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {experiences.length === 0 && <p className="text-sm text-slate-400">No experience entries yet.</p>}
      </div>

      {editingId && (
        <div className="mt-3 border border-primary-200 bg-primary-50/40 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Job title">
              <input className={inputClass} value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} />
            </Field>
            <Field label="Company">
              <input className={inputClass} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
            </Field>
            <Field label="Location">
              <input className={inputClass} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </Field>
            <Field label="Teaching mode">
              <select className={inputClass} value={draft.teachingMode} onChange={(e) => setDraft({ ...draft, teachingMode: e.target.value })}>
                {TEACHING_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </Field>
            <Field label="Start date">
              <input type="date" className={inputClass} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </Field>
            <Field label="End date">
              <input
                type="date"
                className={inputClass}
                value={draft.endDate}
                disabled={draft.isCurrent}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={draft.isCurrent} onChange={(e) => setDraft({ ...draft, isCurrent: e.target.checked })} />
              Currently working here
            </label>
            <Field label="Description" className="md:col-span-2">
              <textarea rows={2} className={inputClass} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#012c54] text-white text-xs font-medium hover:bg-[#012c54]/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            {feedback && <span className="text-xs text-red-600">{feedback}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Education ── */

type EducationDraft = {
  degreeTitle: string; university: string; location: string;
  startDate: string; endDate: string; isOngoing: boolean;
}

const emptyEducation: EducationDraft = {
  degreeTitle: '', university: '', location: '', startDate: '', endDate: '', isOngoing: false,
}

const EducationEditor = ({
  tutorId,
  educations,
  onRefresh,
}: {
  tutorId: string
  educations: NonNullable<EditableTutor['educations']>
  onRefresh: () => Promise<void>
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EducationDraft>(emptyEducation)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const startEdit = (item: NonNullable<EditableTutor['educations']>[number]) => {
    setEditingId(item.id)
    setFeedback('')
    setDraft({
      degreeTitle: item.degreeTitle,
      university: item.university,
      location: item.location,
      startDate: toDateInput(item.startDate),
      endDate: toDateInput(item.endDate),
      isOngoing: item.isOngoing,
    })
  }

  const handleSave = async () => {
    setBusy(true)
    setFeedback('')
    try {
      if (editingId === 'new') {
        await api.post(`/admin/tutors/${tutorId}/educations`, draft)
      } else {
        await api.patch(`/admin/tutors/${tutorId}/educations/${editingId}`, draft)
      }
      await onRefresh()
      setEditingId(null)
    } catch (err: any) {
      setFeedback(err?.response?.data?.error || 'Failed to save education')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this education entry?')) return
    setBusy(true)
    try {
      await api.delete(`/admin/tutors/${tutorId}/educations/${id}`)
      await onRefresh()
    } catch (err: any) {
      setFeedback(err?.response?.data?.error || 'Failed to delete education')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900">Education ({educations.length})</h4>
        <button
          type="button"
          onClick={() => { setEditingId('new'); setDraft(emptyEducation); setFeedback('') }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="space-y-2">
        {educations.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 border border-slate-200 rounded-xl p-3 bg-white">
            <div>
              <div className="text-sm font-semibold text-slate-900">{item.degreeTitle}</div>
              <div className="text-xs text-slate-600">{item.university} · {item.location}</div>
              <div className="text-xs text-slate-400">
                {toDateInput(item.startDate)} – {item.isOngoing ? 'Ongoing' : toDateInput(item.endDate) || '—'}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {educations.length === 0 && <p className="text-sm text-slate-400">No education entries yet.</p>}
      </div>

      {editingId && (
        <div className="mt-3 border border-primary-200 bg-primary-50/40 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Degree title">
              <input className={inputClass} value={draft.degreeTitle} onChange={(e) => setDraft({ ...draft, degreeTitle: e.target.value })} />
            </Field>
            <Field label="University / School">
              <input className={inputClass} value={draft.university} onChange={(e) => setDraft({ ...draft, university: e.target.value })} />
            </Field>
            <Field label="Location">
              <input className={inputClass} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700 mt-6">
              <input type="checkbox" checked={draft.isOngoing} onChange={(e) => setDraft({ ...draft, isOngoing: e.target.checked })} />
              Currently studying
            </label>
            <Field label="Start date">
              <input type="date" className={inputClass} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </Field>
            <Field label="End date">
              <input
                type="date"
                className={inputClass}
                value={draft.endDate}
                disabled={draft.isOngoing}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#012c54] text-white text-xs font-medium hover:bg-[#012c54]/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            {feedback && <span className="text-xs text-red-600">{feedback}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Availability ── */

type AvailabilityDraft = {
  blockTitle: string; daysAvailable: string[]; startTime: string; endTime: string;
  breakTime: number; sessionDuration: number; numberOfSlots: number;
}

const emptyAvailability: AvailabilityDraft = {
  blockTitle: '', daysAvailable: [], startTime: '09:00', endTime: '17:00',
  breakTime: 15, sessionDuration: 60, numberOfSlots: 1,
}

const AvailabilityEditor = ({
  tutorId,
  availabilities,
  onRefresh,
}: {
  tutorId: string
  availabilities: NonNullable<EditableTutor['availabilities']>
  onRefresh: () => Promise<void>
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AvailabilityDraft>(emptyAvailability)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const startEdit = (item: NonNullable<EditableTutor['availabilities']>[number]) => {
    setEditingId(item.id)
    setFeedback('')
    setDraft({
      blockTitle: item.blockTitle,
      daysAvailable: item.daysAvailable ?? [],
      startTime: item.startTime,
      endTime: item.endTime,
      breakTime: item.breakTime,
      sessionDuration: item.sessionDuration,
      numberOfSlots: item.numberOfSlots,
    })
  }

  const handleSave = async () => {
    setBusy(true)
    setFeedback('')
    try {
      if (editingId === 'new') {
        await api.post(`/admin/tutors/${tutorId}/availabilities`, draft)
      } else {
        await api.patch(`/admin/tutors/${tutorId}/availabilities/${editingId}`, draft)
      }
      await onRefresh()
      setEditingId(null)
    } catch (err: any) {
      setFeedback(err?.response?.data?.error || 'Failed to save availability')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this availability block?')) return
    setBusy(true)
    try {
      await api.delete(`/admin/tutors/${tutorId}/availabilities/${id}`)
      await onRefresh()
    } catch (err: any) {
      setFeedback(err?.response?.data?.error || 'Failed to delete availability')
    } finally {
      setBusy(false)
    }
  }

  const toggleDay = (day: string) =>
    setDraft((prev) => ({
      ...prev,
      daysAvailable: prev.daysAvailable.includes(day)
        ? prev.daysAvailable.filter((entry) => entry !== day)
        : [...prev.daysAvailable, day],
    }))

  return (
    <div className="border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900">Availability ({availabilities.length} blocks)</h4>
        <button
          type="button"
          onClick={() => { setEditingId('new'); setDraft(emptyAvailability); setFeedback('') }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="space-y-2">
        {availabilities.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 border border-slate-200 rounded-xl p-3 bg-white">
            <div>
              <div className="text-sm font-semibold text-slate-900">{item.blockTitle}</div>
              <div className="text-xs text-slate-600">{(item.daysAvailable ?? []).join(', ')}</div>
              <div className="text-xs text-slate-400">
                {item.startTime} – {item.endTime} · {item.sessionDuration}min sessions · {item.breakTime}min break · {item.numberOfSlots} slots
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {availabilities.length === 0 && <p className="text-sm text-slate-400">No availability blocks yet.</p>}
      </div>

      {editingId && (
        <div className="mt-3 border border-primary-200 bg-primary-50/40 rounded-xl p-4 space-y-3">
          <Field label="Block title">
            <input className={inputClass} value={draft.blockTitle} onChange={(e) => setDraft({ ...draft, blockTitle: e.target.value })} />
          </Field>
          <Field label="Days available">
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <ChipToggle key={day} active={draft.daysAvailable.includes(day)} onClick={() => toggleDay(day)}>
                  {day.slice(0, 3)}
                </ChipToggle>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Start time">
              <input type="time" className={inputClass} value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            </Field>
            <Field label="End time">
              <input type="time" className={inputClass} value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
            </Field>
            <Field label="Session duration (min)">
              <input type="number" min={15} className={inputClass} value={draft.sessionDuration} onChange={(e) => setDraft({ ...draft, sessionDuration: Number(e.target.value) })} />
            </Field>
            <Field label="Break (min)">
              <input type="number" min={0} className={inputClass} value={draft.breakTime} onChange={(e) => setDraft({ ...draft, breakTime: Number(e.target.value) })} />
            </Field>
            <Field label="Number of slots">
              <input type="number" min={1} className={inputClass} value={draft.numberOfSlots} onChange={(e) => setDraft({ ...draft, numberOfSlots: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#012c54] text-white text-xs font-medium hover:bg-[#012c54]/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            {feedback && <span className="text-xs text-red-600">{feedback}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Student profile editor ── */

export const StudentProfileEditor = ({
  student,
  userEmail,
  onRefresh,
}: {
  student: EditableStudent
  userEmail: string
  onRefresh: () => Promise<void>
}) => {
  const [form, setForm] = useState({
    email: userEmail,
    firstName: student.firstName ?? '',
    lastName: student.lastName ?? '',
    gender: student.gender ?? '',
    grade: student.grade ?? '',
    tagline: student.tagline ?? '',
    bio: student.bio ?? '',
    introduction: student.introduction ?? '',
    country: student.country ?? '',
    state: student.state ?? '',
    city: student.city ?? '',
    address: student.address ?? '',
    zipcode: student.zipcode ?? '',
  })
  const [languages, setLanguages] = useState<string[]>(student.languagesSpoken ?? [])
  const [preferences, setPreferences] = useState<string[]>(student.learningPreferences ?? [])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [errorText, setErrorText] = useState('')

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setFeedback('')
    setErrorText('')
    try {
      await api.patch(`/admin/students/${student.id}/profile`, {
        ...form,
        email: form.email.trim(),
        languagesSpoken: languages,
        learningPreferences: preferences,
      })
      await onRefresh()
      setFeedback('Profile saved')
    } catch (err: any) {
      setErrorText(err?.response?.data?.error || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <ImageUploadControl
        label="Profile photo"
        currentUrl={student.profileImage}
        kind="profile"
        onUploaded={async (url) => {
          await api.patch(`/admin/students/${student.id}/profile`, { profileImage: url })
          await onRefresh()
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="First name">
          <input className={inputClass} value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
        </Field>
        <Field label="Last name">
          <input className={inputClass} value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
        </Field>
        <Field label="Account email">
          <input className={inputClass} value={form.email} onChange={(e) => setField('email', e.target.value)} />
        </Field>
        <Field label="Gender">
          <select className={inputClass} value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
            <option value="">Not set</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </Field>
        <Field label="Grade">
          <select className={inputClass} value={form.grade} onChange={(e) => setField('grade', e.target.value)}>
            <option value="">Not set</option>
            {STUDENT_GRADE_OPTIONS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </Field>
        <Field label="Tagline">
          <input className={inputClass} value={form.tagline} onChange={(e) => setField('tagline', e.target.value)} />
        </Field>
        <Field label="Bio" className="md:col-span-3">
          <textarea rows={3} className={inputClass} value={form.bio} onChange={(e) => setField('bio', e.target.value)} />
        </Field>
        <Field label="Introduction" className="md:col-span-3">
          <textarea rows={2} className={inputClass} value={form.introduction} onChange={(e) => setField('introduction', e.target.value)} />
        </Field>
      </div>

      <Field label="Languages spoken">
        <ChipMultiSelect
          options={LANGUAGE_OPTIONS}
          selected={languages}
          onChange={setLanguages}
          allowCustom
          customPlaceholder="Add another language…"
        />
      </Field>

      <Field label="Learning location preferences">
        <ChipMultiSelect options={LEARNING_PREFERENCES} selected={preferences} onChange={setPreferences} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Address" className="md:col-span-3">
          <input className={inputClass} value={form.address} onChange={(e) => setField('address', e.target.value)} />
        </Field>
        <Field label="City">
          <input className={inputClass} value={form.city} onChange={(e) => setField('city', e.target.value)} />
        </Field>
        <Field label="State / Region">
          <input className={inputClass} value={form.state} onChange={(e) => setField('state', e.target.value)} />
        </Field>
        <Field label="Zipcode">
          <input className={inputClass} value={form.zipcode} onChange={(e) => setField('zipcode', e.target.value)} />
        </Field>
        <Field label="Country">
          <input className={inputClass} value={form.country} onChange={(e) => setField('country', e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#012c54] text-white text-sm font-medium hover:bg-[#012c54]/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save profile details'}
        </button>
        {feedback && <span className="text-sm text-green-600">{feedback}</span>}
        {errorText && <span className="text-sm text-red-600">{errorText}</span>}
      </div>
    </div>
  )
}

/* ── Account controls (role, email confirmation, password) ── */

export const AccountControls = ({
  userId,
  role,
  emailConfirmed,
  onRefresh,
}: {
  userId: string
  role: string
  emailConfirmed: boolean
  onRefresh: () => Promise<void>
}) => {
  const [newRole, setNewRole] = useState(role)
  const [confirmed, setConfirmed] = useState(emailConfirmed)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [errorText, setErrorText] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setFeedback('')
    setErrorText('')
    try {
      await api.patch(`/admin/users/${userId}`, {
        role: newRole,
        emailConfirmed: confirmed,
        ...(password ? { password } : {}),
      })
      setPassword('')
      await onRefresh()
      setFeedback('Account updated')
    } catch (err: any) {
      setErrorText(err?.response?.data?.error || 'Failed to update account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <Field label="Role">
        <select className={inputClass} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
          <option value="STUDENT">Student</option>
          <option value="TUTOR">Tutor</option>
          <option value="ADMIN">Admin</option>
        </select>
      </Field>
      <Field label="Set new password (min 8 chars)">
        <input
          type="text"
          className={inputClass}
          value={password}
          placeholder="Leave blank to keep current"
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        Email confirmed
      </label>
      <div className="md:col-span-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#012c54] text-white text-sm font-medium hover:bg-[#012c54]/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save account settings'}
        </button>
        {feedback && <span className="text-sm text-green-600">{feedback}</span>}
        {errorText && <span className="text-sm text-red-600">{errorText}</span>}
      </div>
    </div>
  )
}
