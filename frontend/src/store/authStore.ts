import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearStudentProfileGateCache } from '../lib/studentProfileAccess'

export type UserRole = 'ADMIN' | 'TUTOR' | 'STUDENT'

export interface User {
  id: string
  email: string
  role: UserRole
  emailConfirmed?: boolean
  tutorId?: string
  studentId?: string
  profileImage?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        // Never carry the previous account's gate state into a new session.
        clearStudentProfileGateCache()
        set({ user, token })
      },
      logout: () => {
        clearStudentProfileGateCache()
        set({ user: null, token: null })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

