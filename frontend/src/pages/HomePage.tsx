import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuthStore } from '../store/authStore'

const HomePage = () => {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50">
      <Navbar />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wide">
              Welcome to JTutor
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              Personalised tutoring designed around every learner’s goals.
            </h1>
            <p className="mt-6 text-lg text-slate-600">
              JTutor connects ambitious students with inspiring tutors. Build a rich learning profile, find your perfect match,
              and track progress all in one beautiful dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {!user && (
                <>
                  <Link to="/register?role=student" className="btn btn-primary text-base px-6 py-3">
                    Explore tutors
                  </Link>
                  <Link to="/register?role=tutor" className="btn btn-outline text-base px-6 py-3">
                    Apply as a tutor
                  </Link>
                </>
              )}
              {user && (
                <Link
                  to={user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'TUTOR' ? '/tutor/dashboard' : '/student/dashboard'}
                  className="btn btn-primary text-base px-6 py-3"
                >
                  Go to my dashboard
                </Link>
              )}
            </div>

            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5 text-slate-600 text-sm">
              <div className="bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary-600">4.9/5</p>
                <p className="mt-1 text-xs uppercase tracking-wide">Average tutor rating</p>
              </div>
              <div className="bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary-600">120+</p>
                <p className="mt-1 text-xs uppercase tracking-wide">Subjects covered</p>
              </div>
              <div className="bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary-600">3k+</p>
                <p className="mt-1 text-xs uppercase tracking-wide">Learners supported</p>
              </div>
              <div className="bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary-600">98%</p>
                <p className="mt-1 text-xs uppercase tracking-wide">Parent satisfaction</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -left-6 h-72 w-72 bg-primary-100 rounded-full blur-3xl opacity-60"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
              <img
                src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80"
                alt="Students learning together"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Everything you need to thrive</h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Whether you’re learning or teaching, JTutor gives you the tools to stay organised, motivated, and inspired.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <span className="text-4xl">🎯</span>
              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold">Smart matching</span>
            </div>
            <h3 className="text-xl font-semibold mt-4">Curated tutor matches</h3>
            <p className="text-slate-600 mt-2">
              Build your learner profile and let JTutor recommend tutors who align with your goals, schedule, and learning style.
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <span className="text-4xl">📊</span>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">Transparent progress</span>
            </div>
            <h3 className="text-xl font-semibold mt-4">Progress dashboards</h3>
            <p className="text-slate-600 mt-2">
              Track milestones, share resources, and keep everyone aligned with beautiful analytics built for parents and tutors.
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <span className="text-4xl">🔐</span>
              <span className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold">Secure by default</span>
            </div>
            <h3 className="text-xl font-semibold mt-4">Safe & reliable</h3>
            <p className="text-slate-600 mt-2">
              Verified tutors, background checks, and secure payments keep your focus where it matters—on learning.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage

