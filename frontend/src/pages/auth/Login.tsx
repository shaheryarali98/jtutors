import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

interface LoginForm {
  email: string
  password: string
}

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const response = await api.post('/auth/login', data)
      setAuth(response.data.user, response.data.token)
      setSuccess(response.data.message || 'Login successful')

      let destination: string
      if (response.data.user.role === 'ADMIN') {
        destination = '/admin/dashboard'
      } else if (response.data.user.role === 'TUTOR') {
        destination = '/tutor/dashboard'
      } else {
        try {
          const me = await api.get('/auth/me')
          const profileCompleted = Boolean(me.data.student?.profileCompleted)
          destination = profileCompleted ? '/student/dashboard' : '/student/profile'
        } catch (meError) {
          console.error('Failed to resolve student profile status:', meError)
          destination = '/student/profile'
        }
      }

      setTimeout(() => {
        navigate(destination)
      }, 900)
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to server. Please check your internet connection or contact support.')
      } else {
        setError(err.response?.data?.error || err.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-100">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="hidden lg:block h-full">
            <img
              src="/logo1.jpg"
              alt="JTutors login"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-8 md:p-12">
            <div className="text-left">
              <h2 className="text-3xl font-bold text-slate-900">Welcome back 👋</h2>
              <p className="text-slate-500 mt-2">
                Sign in with your JTutors account to continue learning or managing your sessions.
              </p>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mt-6">
                {success}
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

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                  Join JTutors
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Login

