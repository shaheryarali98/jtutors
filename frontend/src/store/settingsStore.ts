import { create } from 'zustand'
import api from '../lib/api'

export interface PlatformSettings {
  sendSignupConfirmation: boolean
  sendProfileCompletionEmail: boolean
  autoApproveUsers: boolean
  adminCommissionPercentage: number
  adminCommissionFixed: number
  withdrawalAutoApproveDays: number | null
  withdrawMethods: string[]
  withdrawFixedCharge?: number
  withdrawPercentageCharge?: number
  minimumWithdrawAmount?: number
  minimumBalanceForWithdraw?: number
  withdrawThreshold?: number | null
  genderFieldEnabled: boolean
  gradeFieldEnabled: boolean
  stateFieldEnabled: boolean
  emailLogo?: string | null
  emailSenderName?: string | null
  emailSenderEmail?: string | null
  emailFooterCopyright?: string | null
  emailSenderSignature?: string | null
  emailFooterColor?: string | null
  defaultStudentImage?: string | null
  defaultTutorImage?: string | null
  hourlyFee: {
    min: number
    max: number
  }
}

interface PlatformSettingsState {
  settings: PlatformSettings | null
  loading: boolean
  error: string
  fetchSettings: () => Promise<void>
}

export const usePlatformSettings = create<PlatformSettingsState>((set, get) => ({
  settings: null,
  loading: false,
  error: '',
  fetchSettings: async () => {
    if (get().settings || get().loading) return
    try {
      set({ loading: true, error: '' })
      const response = await api.get<{ settings: PlatformSettings }>('/settings/public')
      set({ settings: response.data.settings, loading: false })
    } catch (error) {
      console.error('Error fetching platform settings:', error)
      set({ error: 'Unable to load platform settings', loading: false })
    }
  },
}))


