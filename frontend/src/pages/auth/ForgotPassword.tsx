import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import { withApiRetry } from '../../lib/apiRetry'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

interface ForgotPasswordForm {
  email: string
}

const ForgotPassword = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [retryMsg, setRetryMsg] = useState('')

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      setRetryMsg('')
      const response = await withApiRetry(
        () => api.post('/auth/forgot-password', { email: data.email }),
        (attempt, total) => setRetryMsg(`Server is starting up\u2026 (attempt ${attempt + 1} of ${total})`)
      )
      setRetryMsg('')
      setSuccess(response.data.message || 'Password reset link has been sent to your email')
    } catch (err: any) {
      setRetryMsg('')
      console.error('Forgot password error:', err)
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('The server is taking longer than usual. Please try again in 30 seconds.')
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Server is temporarily unavailable. Please try again in 30 seconds.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to process password reset request')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-100">
      <Navbar />

      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Reset your password</h2>
            <p className="text-slate-500 mt-2">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mt-6">
              <p className="font-medium">{success}</p>
              <p className="text-sm mt-1">Check your email for the reset link. The link will expire in 1 hour.</p>
            </div>
          )}

          {retryMsg && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mt-6 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              {retryMsg}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mt-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@jtutors.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3"
            >
              {loading ? 'Sending reset link...' : 'Send password reset link'}
            </button>
          </form>

          <div className="mt-6 text-center border-t pt-6">
            <p className="text-sm text-slate-600">
              Remember your password?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default ForgotPassword
