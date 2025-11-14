import Navbar from '../components/Navbar'
import {
  Search,
  ChevronRight,
  Star,
  Shield,
  Quote,
  MapPin,
} from 'lucide-react'

const categoryOptions = [
  'Arts, Music & Design',
  'Humanities & Social Studies',
  'Jewish Studies',
  'Languages',
  'Mathematics & Statistics',
  'Science, Medicine & Engineering',
  'Sports, Fitness & Recreation',
  'Technology & Computer Science',
  'Test Preparation',
]

const popularSearches = ['Languages', 'SAT Math', 'Jewish Studies', 'STEM Clubs']

const featureHighlights = [
  {
    title: 'Expert Tutors',
    description:
      'JTutors connects students with experienced, diverse tutors across every major subject, learning goal, and budget.',
  },
  {
    title: 'Flexible Learning Options',
    description:
      'Choose online via Zoom, in-person with local tutors, or a hybrid approach — lessons that fit your schedule.',
  },
  {
    title: 'Seamless Communication & Replay',
    description:
      'Google Classroom integration keeps students and tutors aligned, while recorded sessions support ongoing review.',
  },
  {
    title: 'All-in-One Scheduling',
    description:
      'Book, reschedule, and manage sessions directly on JTutors. No extra emails or tools required.',
  },
  {
    title: 'Safe & Secure',
    description:
      'Built-in messaging, secure payments, and dedicated support for the Jewish community’s learning needs.',
  },
  {
    title: 'Customised Search & Matching',
    description:
      'Advanced filters by subject, grade, location, learning style, and tutor background help you find the perfect match instantly.',
  },
]

const platformStats = [
  { label: 'Courses available for verified & top tutors', value: '560,616+' },
  { label: 'Tutoring jobs posted to date', value: '648,482+' },
  { label: 'Daily average time spent on the platform', value: '20+ Hours' },
  { label: 'Active tutors and students', value: '7+ Million' },
]

const popularCategories = [
  {
    name: 'Languages',
    count: '47 Listings',
    topics: ['Braille', 'Bulgarian', 'Czech', 'Dutch'],
  },
  {
    name: 'Test Preparation',
    count: '38 Listings',
    topics: ['ACT English', 'SAT Math', 'SAT Reading', 'ACT Science'],
  },
  {
    name: 'Science, Medicine & Engineering',
    count: '52 Listings',
    topics: ['Anatomy', 'Astronomy', 'Biochemistry', 'Biology'],
  },
  {
    name: 'Technology & Computer Science',
    count: '41 Listings',
    topics: ['Web Development', 'Robotics', 'Game Design', 'Coding Bootcamps'],
  },
]

const successStories = [
  {
    title: 'I highly recommend this platform, amazing experience with fast delivery',
    quote:
      '“It is a long established fact that a learner will be inspired by the right mentor. JTutors made it effortless to find that match.”',
    author: 'Michael Mueller',
    role: '5th Grade Student, Dubai',
  },
  {
    title: 'Professional, responsive, and truly caring mentors',
    quote:
      '“The tutors understand our community’s values and deliver excellent guidance. Support is always a message away.”',
    author: 'Bobbie Schwartz',
    role: 'Parent, Manchester UK',
  },
  {
    title: 'Thoughtful coaching turned my studies around',
    quote:
      '“I was nervous before my first session. JTutors matched me with the perfect tutor, and now I look forward to learning.”',
    author: 'Cecil Sims',
    role: '7th Grade Student, Rome Italy',
  },
]

const featuredTutors = [
  {
    name: 'Filomena Galicia',
    location: 'Austin, AZ',
    rate: '$55.00/hr',
    qualification: 'MBBS',
    rating: '5.0',
  },
  {
    name: 'Steven Ford',
    location: 'Charlotte, OK',
    rate: '$21.00/hr',
    qualification: 'Math Specialist',
    rating: '5.0',
  },
  {
    name: 'Loise Mullens',
    location: 'Tampa, LA',
    rate: '$99.00/hr',
    qualification: 'STEM Mentor',
    rating: '5.0',
  },
  {
    name: 'Ann Coleman',
    location: 'Baltimore, NV',
    rate: '$79.00/hr',
    qualification: 'SAT Coach',
    rating: '5.0',
  },
]

const HomePage = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="relative overflow-hidden">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
          <div className="absolute inset-0 bg-grid-white/10" aria-hidden="true" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="grid lg:grid-cols-[3fr,2fr] gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-semibold uppercase tracking-wide">
                  <Shield className="h-4 w-4" />
                  Trusted, vetted tutors for the Jewish community
                </span>
                <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
                  Where Jewish Students and Tutors Connect
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-white/90">
                  JTutors connects students and families with trusted, vetted tutors who understand the academic
                  needs of the Jewish community. Learn online, in person, or both — with a platform designed around
                  your goals.
                </p>

                <div className="mt-10 rounded-3xl bg-white/95 p-6 shadow-xl">
                  <form className="grid gap-4 lg:grid-cols-[2fr,2fr,auto]">
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold uppercase text-slate-500">Select category</label>
                      <select className="mt-2 rounded-xl border border-slate-200 px-4 py-3 focus:border-indigo-500 focus:outline-none">
                        {categoryOptions.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold uppercase text-slate-500">Search keywords</label>
                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 focus-within:border-indigo-500">
                        <Search className="h-5 w-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Hebrew, calculus, robotics"
                          className="w-full bg-transparent text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-indigo-700"
                    >
                      Search now
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </form>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="font-semibold text-slate-600">Popular searches:</span>
                    {popularSearches.map((item) => (
                      <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                    </div>

              <div className="hidden lg:block">
                <div className="relative rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur">
                  <img
                    src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80"
                    alt="JTutors community"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                  <div className="absolute -bottom-6 left-1/2 w-56 -translate-x-1/2 rounded-2xl bg-white px-6 py-4 text-center shadow-xl">
                    <p className="text-sm font-semibold text-slate-600">Trusted by families worldwide</p>
                    <p className="text-xl font-black text-indigo-600">7+ Million learners</p>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </section>

        {/* Platform Highlights */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-black text-slate-900">JTutors – A Revolutionary Jewish Tutoring Platform</h2>
            <p className="mt-4 text-lg text-slate-600">
              Find your perfect tutor today—online, in person, or both. JTutors makes tutoring seamless, affordable,
              safe, and tailored to every learner.
            </p>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featureHighlights.map((feature) => (
                <div key={feature.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                      </div>
              ))}
                  </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-slate-100">
          <div className="max-w-6xl mx-auto grid gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformStats.map((stat) => (
              <div key={stat.label} className="rounded-3xl bg-white p-6 shadow-lg">
                <p className="text-3xl font-black text-indigo-600">{stat.value}</p>
                <p className="mt-2 text-sm font-medium text-slate-600">{stat.label}</p>
              </div>
            ))}
        </div>
      </section>

        {/* Popular categories */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Choose from one of the popular categories below</h2>
                <p className="mt-2 text-slate-600">
                  Explore subjects taught by verified tutors who understand your academic and cultural priorities.
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600">
                Explore all tutors
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {popularCategories.map((category) => (
                <div key={category.name} className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">{category.name}</h3>
                    <span className="text-sm font-semibold text-indigo-600">{category.count}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {category.topics.map((topic) => (
                      <span key={topic} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success stories */}
        <section className="py-16 bg-slate-100">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-black text-slate-900 text-center">See how our members found #Success</h2>
            <p className="mt-2 text-center text-slate-600">
              Real stories from students, tutors, and families thriving with JTutors.
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {successStories.map((story) => (
                <div key={story.title} className="rounded-3xl bg-white p-6 shadow-md">
                  <Quote className="h-10 w-10 text-indigo-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{story.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{story.quote}</p>
                  <div className="mt-6 text-sm font-medium text-indigo-600">{story.author}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{story.role}</div>
                </div>
            ))}
          </div>
        </div>
      </section>

        {/* Featured tutors */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Every tutor is professional and highly qualified</h2>
                <p className="mt-2 text-slate-600">Featured tutors ready to start today.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600">
                Browse tutors
                <ChevronRight className="h-4 w-4" />
              </button>
        </div>
        
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredTutors.map((tutor) => (
                <div key={tutor.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{tutor.name}</h3>
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      {tutor.rating}
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {tutor.location}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-indigo-600">Starting from {tutor.rate}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{tutor.qualification}</p>
                  <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700">
                    View profile
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Question form */}
        <section className="relative overflow-hidden py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-95" />
          <div className="relative max-w-4xl mx-auto rounded-3xl bg-white/10 p-10 text-white shadow-2xl backdrop-blur">
            <h2 className="text-3xl font-black">Didn’t find your question here?</h2>
            <p className="mt-2 text-base text-white/80">
              Send us your question and our team will respond within 24 hours.
            </p>
            <form className="mt-8 grid gap-4 md:grid-cols-2">
              <input className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder:text-white/60 focus:border-white focus:outline-none" placeholder="Full name" />
              <input className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder:text-white/60 focus:border-white focus:outline-none" placeholder="Email address" />
              <input className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder:text-white/60 focus:border-white focus:outline-none md:col-span-2" placeholder="Question subject" />
              <textarea className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder:text-white/60 focus:border-white focus:outline-none md:col-span-2" rows={4} placeholder="Describe how we can help" />
              <label className="flex items-center gap-2 text-xs text-white/80 md:col-span-2">
                <input type="checkbox" className="rounded border-white/40 bg-white/10" />
                I have read and agree to all Terms &amp; Conditions.
              </label>
              <button type="button" className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-lg hover:bg-slate-100 md:col-span-2">
                Submit your question
                <ChevronRight className="h-4 w-4" />
            </button>
            </form>
          </div>
      </section>
      </main>
    </div>
  )
}

export default HomePage