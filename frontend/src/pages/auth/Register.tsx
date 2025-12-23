import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  role: 'TUTOR' | 'STUDENT' | 'ADMIN'
}

const Register = () => {
  const STUDENT_REGISTRATION_DISABLED = false
  
  const [searchParams] = useSearchParams()
  const requestedRole = searchParams.get('role')?.toUpperCase() as RegisterForm['role'] | null
  const includeAdminOption = useMemo(
    () => (requestedRole === 'ADMIN' ? true : false),
    [requestedRole]
  )
  const defaultRole = requestedRole && ['TUTOR', 'STUDENT', 'ADMIN'].includes(requestedRole) 
    ? requestedRole
    : 'STUDENT'
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      role: defaultRole || 'STUDENT'
    }
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true)
      setError('')
      const response = await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        role: data.role
      })
      setAuth(response.data.user, response.data.token)
      setSuccess(response.data.message || 'Account created successfully')

      const destination =
        response.data.user.role === 'ADMIN'
          ? '/admin/dashboard'
          : response.data.user.role === 'TUTOR'
            ? '/tutor/profile'
            : '/student/profile'

      setTimeout(() => {
        navigate(destination)
      }, 1100)
    } catch (err: any) {
      console.error('Registration error:', err)
      // Check for timeout errors specifically
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('The server is taking longer than usual to respond. This may be due to the service starting up. Please try again in a few moments.')
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to server. Please check your internet connection or contact support.')
      } else {
        setError(err.response?.data?.error || err.message || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-100">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="hidden lg:block h-full">
          <img
  src="/logo1.jpg"
  alt="Create JTutors account"
  className="h-full w-full object-cover"
/>

          </div>

          <div className="p-8 md:p-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Create your JTutors account</h2>
              <p className="text-slate-500 mt-2">
                Choose your role and get started in under a minute. We’ll guide you through the rest.
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
                <label className="label">I am joining JTutors as</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!STUDENT_REGISTRATION_DISABLED && <RoleOption value="STUDENT" label="Student" register={register} />}
                  <RoleOption value="TUTOR" label="Tutor" register={register} />
                  {includeAdminOption && <RoleOption value="ADMIN" label="Platform Admin" register={register} />}
                </div>
                {STUDENT_REGISTRATION_DISABLED && (
                  <p className="mt-2 text-sm text-slate-500 italic">
                    Student registration is temporarily unavailable. Only tutor registration is open at this time.
                  </p>
                )}
              </div>

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
                  placeholder="Create a secure password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                />
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Retype your password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                />
                {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                  Sign in here
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

interface RoleOptionProps {
  value: RegisterForm['role']
  label: string
  register: ReturnType<typeof useForm<RegisterForm>>['register']
}

const RoleOption = ({ value, label, register }: RoleOptionProps) => (
  <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:border-primary-400 transition-colors">
    <input
      type="radio"
      value={value}
      {...register('role', { required: true })}
      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
    />
    <span className="text-sm font-medium text-slate-700">{label}</span>
  </label>
)

export default Register


