import { useEffect, useState } from 'react'
import api from '../../lib/api'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Shield,
  FileText,
  Users,
  Zap,
} from 'lucide-react'

interface BackgroundCheckProps {
  onSaveSuccess?: () => void
}

const BackgroundCheck = ({ onSaveSuccess }: BackgroundCheckProps) => {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        const bgCheck = res.data.tutor?.backgroundCheck
        if (bgCheck) setStatus(bgCheck.status)
      })
      .catch(err => console.error('Error fetching background check status:', err))
      .finally(() => setFetching(false))
  }, [])

  const handleStart = async () => {
    try {
      setError(null)
      setLoading(true)
      const res = await api.post('/checkr/start-background-check')
      
      // Validate response contains the applyUrl
      if (!res.data || !res.data.applyUrl) {
        const errorMsg = res.data?.error || 'No Checkr URL received from server'
        console.error('[BackgroundCheck] Invalid response:', res.data)
        setError(errorMsg)
        return
      }
      
      const { applyUrl } = res.data
      
      // Only set status after confirming redirect will work
      setStatus('PENDING')
      if (onSaveSuccess) onSaveSuccess()
      window.dispatchEvent(new Event('tutor-profile-updated'))
      
      // Open Checkr apply link in a new tab
      window.open(applyUrl, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to start background check'
      console.error('[BackgroundCheck] Error:', err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-12 w-12 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-12 w-12 text-red-600" />
      case 'REVIEW':
        return <AlertCircle className="h-12 w-12 text-amber-600" />
      case 'PENDING':
        return <Clock className="h-12 w-12 text-blue-600" />
      case 'EXPIRED':
        return <AlertCircle className="h-12 w-12 text-gray-600" />
      default:
        return <Shield className="h-12 w-12 text-slate-600" />
    }
  }

  const getStatusColor = (variant: 'bg' | 'border' | 'badge' | 'text' = 'bg') => {
    if (variant === 'bg') {
      return status === 'APPROVED' ? 'bg-green-50' :
             status === 'REJECTED' ? 'bg-red-50' :
             status === 'REVIEW' ? 'bg-amber-50' :
             status === 'PENDING' ? 'bg-blue-50' :
             status === 'EXPIRED' ? 'bg-gray-50' :
             'bg-slate-50'
    }
    if (variant === 'border') {
      return status === 'APPROVED' ? 'border-green-200' :
             status === 'REJECTED' ? 'border-red-200' :
             status === 'REVIEW' ? 'border-amber-200' :
             status === 'PENDING' ? 'border-blue-200' :
             status === 'EXPIRED' ? 'border-gray-200' :
             'border-slate-200'
    }
    if (variant === 'badge') {
      return status === 'APPROVED' ? 'bg-green-100 text-green-800' :
             status === 'REJECTED' ? 'bg-red-100 text-red-800' :
             status === 'REVIEW' ? 'bg-amber-100 text-amber-800' :
             status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
             status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
             'bg-slate-100 text-slate-800'
    }
    return status === 'APPROVED' ? 'text-green-700' :
           status === 'REJECTED' ? 'text-red-700' :
           status === 'REVIEW' ? 'text-amber-700' :
           status === 'PENDING' ? 'text-blue-700' :
           status === 'EXPIRED' ? 'text-gray-700' :
           'text-slate-700'
  }

  const statusLabel = status === 'PENDING' ? 'SUBMITTED' : (status || 'NOT STARTED')

  const statusMessage = () => {
    switch (status) {
      case 'PENDING':
        return {
          title: 'Background Check Submitted',
          message: 'Your background check has been submitted to Checkr. Our admin team is reviewing your application.',
          details: 'This typically takes 1-3 business days. We\'ll send you an email once the review is complete.',
        }
      case 'APPROVED':
        return {
          title: 'Background Check Approved ✓',
          message: 'Congratulations! Your background check has been approved.',
          details: 'Your profile is now fully active and visible to students. You can start accepting bookings.',
        }
      case 'REVIEW':
        return {
          title: 'Additional Review Required',
          message: 'Your background check is under additional review.',
          details: 'Our team will contact you shortly if we need any clarification. No action needed from you right now.',
        }
      case 'REJECTED':
        return {
          title: 'Background Check Not Approved',
          message: 'Unfortunately, your background check was not approved.',
          details: 'Please contact our support team at support@jtutor.com for more information and next steps.',
        }
      case 'EXPIRED':
        return {
          title: 'Background Check Expired',
          message: 'Your background check has expired.',
          details: 'You\'ll need to submit a new one to continue tutoring. Click the button below to get started.',
        }
      default:
        return null
    }
  }

  const msg = statusMessage()

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block">
            <svg className="animate-spin h-8 w-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm mt-3">Loading background check status…</p>
        </div>
      </div>
    )
  }

  const isNotStarted = !status
  const isPending = status === 'PENDING'
  const isApproved = status === 'APPROVED'
  const isRejected = status === 'REJECTED'
  const isExpired = status === 'EXPIRED'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-bold text-slate-900">Background Check</h2>
          <Shield className="h-7 w-7 text-orange-600" />
        </div>
        <p className="text-slate-600 text-lg">
          Complete your background check to unlock your full tutor profile and accept bookings.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Error Starting Background Check</p>
            <p className="text-red-800 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 flex-shrink-0"
          >
            <AlertCircle className="h-5 w-5 opacity-50" />
          </button>
        </div>
      )}

      {/* Status Card - Only show if status exists */}
      {status && (
        <div className={`border-2 rounded-2xl p-8 ${getStatusColor('bg')} ${getStatusColor('border')} transition-all`}>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 pt-1">
              {getStatusIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={`text-xl font-bold ${getStatusColor('text')}`}>{msg?.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor('badge')}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-slate-900 font-medium mb-2">{msg?.message}</p>
              <p className="text-slate-600 text-sm">{msg?.details}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main CTA Section */}
      {(isNotStarted || isExpired) && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-8">
          <div className="flex items-start gap-6">
            <div className="p-3 bg-orange-600 rounded-full flex-shrink-0">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Get Started in 3 Steps</h3>
              <ol className="space-y-3 text-slate-700 text-sm mb-6">
                <li className="flex gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-600 text-white text-xs font-bold flex-shrink-0">1</span>
                  <span><strong>Click "Start Background Check"</strong> - You'll be guided to Checkr's secure form</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-600 text-white text-xs font-bold flex-shrink-0">2</span>
                  <span><strong>Complete the Checkr form</strong> - Takes 5-10 minutes with your personal info</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-600 text-white text-xs font-bold flex-shrink-0">3</span>
                  <span><strong>Admin review</strong> - We'll verify within 1-3 business days</span>
                </li>
              </ol>

              <button
                onClick={handleStart}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Opening Checkr…</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-5 w-5" />
                    <span>Start Background Check</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Actions */}
      {isPending && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8">
          <div className="flex items-start gap-6">
            <div className="p-3 bg-blue-600 rounded-full flex-shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">What's Next?</h3>
              <p className="text-slate-700 text-sm mb-4">
                Your background check is with our admin team for review. While you wait, you can start setting up the rest of your profile.
              </p>
              <button
                onClick={handleStart}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-medium rounded-lg border-2 border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Opening…' : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Return to Checkr Form
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards Grid */}
      {!isApproved && !isRejected && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex gap-3 mb-2">
              <Shield className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <h4 className="font-bold text-slate-900">Secure & Encrypted</h4>
            </div>
            <p className="text-sm text-slate-600">Your data is encrypted and processed securely by Checkr, a trusted background check provider.</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex gap-3 mb-2">
              <Clock className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <h4 className="font-bold text-slate-900">Fast Review</h4>
            </div>
            <p className="text-sm text-slate-600">Most background checks are reviewed within 1-3 business days. You'll get notified via email.</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex gap-3 mb-2">
              <Users className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <h4 className="font-bold text-slate-900">Parent Confidence</h4>
            </div>
            <p className="text-sm text-slate-600">Parents trust verified tutors. Completing your background check boosts your credibility.</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex gap-3 mb-2">
              <FileText className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <h4 className="font-bold text-slate-900">Simple Process</h4>
            </div>
            <p className="text-sm text-slate-600">Just provide your basic info, driver's license, and SSN. No additional documents needed.</p>
          </div>
        </div>
      )}

      {/* Approved State - Show next steps */}
      {isApproved && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8">
          <h3 className="text-lg font-bold text-green-900 mb-4">You're All Set! 🎉</h3>
          <ul className="space-y-3 text-green-800 text-sm mb-6">
            <li className="flex gap-3 items-start">
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>Your profile is now fully active and visible to students</span>
            </li>
            <li className="flex gap-3 items-start">
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>You can start accepting bookings immediately</span>
            </li>
            <li className="flex gap-3 items-start">
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>Parents see your verified status on your profile</span>
            </li>
          </ul>
          <p className="text-sm text-green-700 font-medium">Complete the rest of your profile to maximize your chances of getting booked!</p>
        </div>
      )}

      {/* Rejected State - Show support info */}
      {isRejected && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8">
          <h3 className="text-lg font-bold text-red-900 mb-4">Background Check Not Approved</h3>
          <p className="text-red-800 text-sm mb-6">
            Your background check was not approved. Our admin team will review your case. Please contact our support team for more information about your specific situation.
          </p>
          <a
            href="mailto:support@jtutor.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
            Contact Support
          </a>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-200">
        <strong>Privacy Notice:</strong> Your background check is processed securely by Checkr, Inc. Your personal information is not shared with JTutors and is processed according to Checkr's privacy policy.
      </p>
    </div>
  )
}

export default BackgroundCheck
