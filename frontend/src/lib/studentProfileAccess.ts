import api from './api'
import type { User } from '../store/authStore'

type StudentProfilePayload = {
  firstName?: string | null
  lastName?: string | null
  country?: string | null
  city?: string | null
  timezone?: string | null
  zipcode?: string | null
  languagesSpoken?: string[]
  profileCompleted?: boolean
  termsAccepted?: boolean
}

const PROFILE_GATE_CACHE_KEY = 'student-profile-gate'

/**
 * Bump this to invalidate every browser's stored gate state on the next load.
 * Entries written by an older build are ignored and removed, so nobody has to
 * clear their browser or sign in again to pick up a fix.
 */
const PROFILE_GATE_CACHE_VERSION = 2

type StudentProfileGateCache = {
  profileCompleted: boolean
  termsAccepted: boolean
}

type StoredGateCache = StudentProfileGateCache & { version?: number }

export const getStudentProfileGateCache = (): StudentProfileGateCache | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(PROFILE_GATE_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredGateCache
    if (parsed?.version !== PROFILE_GATE_CACHE_VERSION) {
      window.sessionStorage.removeItem(PROFILE_GATE_CACHE_KEY)
      return null
    }

    return { profileCompleted: parsed.profileCompleted, termsAccepted: parsed.termsAccepted }
  } catch (error) {
    console.error('Unable to read student profile gate cache:', error)
    return null
  }
}

export const setStudentProfileGateCache = (value: StudentProfileGateCache) => {
  if (typeof window === 'undefined') return

  try {
    const payload: StoredGateCache = { ...value, version: PROFILE_GATE_CACHE_VERSION }
    window.sessionStorage.setItem(PROFILE_GATE_CACHE_KEY, JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent('student-profile-gate-updated', { detail: value }))
  } catch (error) {
    console.error('Unable to write student profile gate cache:', error)
  }
}

export const clearStudentProfileGateCache = () => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.removeItem(PROFILE_GATE_CACHE_KEY)
  } catch (error) {
    console.error('Unable to clear student profile gate cache:', error)
  }
}

export const getStudentProfileGateStatus = (student: StudentProfilePayload | null | undefined) => {
  const missingFields: string[] = []

  if (!student?.profileCompleted) {
    missingFields.push('profileCompleted')
  }

  if (!student?.termsAccepted) {
    missingFields.push('termsAccepted')
  }

  return {
    allowed: missingFields.length === 0,
    missingFields,
  }
}

export const isStudentProfileComplete = (student: StudentProfilePayload | null | undefined) =>
  getStudentProfileGateStatus(student).allowed

export const resolveTutorProfileAccess = async (user: User | null) => {
  if (!user) {
    return { allowed: false, redirectTo: '/student/profile' }
  }

  if (user.role !== 'STUDENT') {
    return { allowed: true, redirectTo: null }
  }

  const cached = getStudentProfileGateCache()
  if (cached?.profileCompleted && cached?.termsAccepted) {
    return { allowed: true, redirectTo: null }
  }

  try {
    const response = await api.get('/student/profile')
    const student = response.data?.student as StudentProfilePayload | undefined
    const gate = getStudentProfileGateStatus(student)

    setStudentProfileGateCache({
      profileCompleted: Boolean(student?.profileCompleted),
      termsAccepted: Boolean(student?.termsAccepted),
    })

    if (!gate.allowed) {
      console.log('Profile Gate Check Failed Reason:', gate.missingFields, {
        profileCompleted: student?.profileCompleted,
        termsAccepted: student?.termsAccepted,
        firstName: student?.firstName,
        lastName: student?.lastName,
        country: student?.country,
        city: student?.city,
        timezone: student?.timezone,
        zipcode: student?.zipcode,
        languagesSpokenCount: Array.isArray(student?.languagesSpoken) ? student.languagesSpoken.length : 0,
      })
    }

    return {
      allowed: gate.allowed,
      redirectTo: gate.allowed ? null : '/student/profile',
    }
  } catch (error) {
    // A network blip or a 5xx must not bounce a student who has completed
    // their profile. Only an explicit 401/403 means they genuinely lack
    // access; anything else fails open and lets the page load.
    const status = (error as { response?: { status?: number } })?.response?.status
    console.error('Unable to verify student profile completion:', error)

    if (status === 401 || status === 403) {
      return { allowed: false, redirectTo: '/student/profile' }
    }

    return { allowed: true, redirectTo: null }
  }
}
