import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import api from '../../lib/api'
import { withApiRetry } from '../../lib/apiRetry'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

interface ResetPasswordForm {
  password: string
  confirmPassword: string
}

const ResetPassword = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)
  const [retryMsg, setRetryMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const password = watch('password')

  useEffect(() => {
    if (!token || !email) {
      setInvalidToken(true)
      setError('Invalid or missing reset link. Please request a new password reset.')
    }
  }, [token, email])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token || !email) {
      setError('Invalid reset link')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      setRetryMsg('')
      const response = await withApiRetry(
        () => api.post('/auth/reset-password', { email, token, password: data.password }),
        (attempt, total) => setRetryMsg(`Server is starting up\u2026 (attempt ${attempt + 1} of ${total})`)
      )
      setRetryMsg('')
      setSuccess(response.data.message || 'Password has been reset successfully')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setRetryMsg('')
      console.error('Reset password error:', err)
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('The server is taking longer than usual. Please try again in 30 seconds.')
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Server is temporarily unavailable. Please try again in 30 seconds.')
      } else if (err.response?.data?.error === 'Reset link has expired. Please request a new one.') {
        setError(err.response.data.error)
        setInvalidToken(true)
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to reset password')
      }
    } finally {
      setLoading(false)
    }
  }

  if (invalidToken && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-100">
        <Navbar />
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Invalid or Expired Link</h2>
              <p className="text-slate-500 mt-4">{error}</p>
            </div>
            <div className="mt-6 text-center">
              <Link 
                to="/forgot-password" 
                className="btn btn-primary py-2 px-6 inline-block"
              >
                Request new reset link
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-100">
      <Navbar />

      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Create new password</h2>
            <p className="text-slate-500 mt-2">
              Enter a new password for your JTutors account.
            </p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mt-6">
              <p className="font-medium">{success}</p>
              <p className="text-sm mt-1">Redirecting to login...</p>
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
              <label className="label">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Create a secure password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Retype your password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || success !== ''}
              className="w-full btn btn-primary py-3"
            >
              {loading ? 'Resetting password...' : 'Reset password'}
            </button>
          </form>

          <div className="mt-6 text-center border-t pt-6">
            <p className="text-sm text-slate-600">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default ResetPassword
