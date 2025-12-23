import { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { faqs } from '../constants/faqs'

/*
const categoryOptions = [
  'Standardized Tests',
  'Mathematics',
  'Science',
  'Computer Science / Technology',
  'Languages',
  'History / Social Studies',
  'Business / Law',
  'Jewish Studies',
  'English / Literature / Writing',
  'Music / Art',
  'Other / Skills',
]
*/

// const popularSearches = ['Languages', 'SAT Math', 'Jewish Studies', 'STEM Clubs']

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

/*
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
*/

const HomePage = () => {
  // const { user } = useAuthStore()
  // const browseTutorsUrl = user?.role === 'STUDENT' ? '/student/browse-tutors' : '/login'
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index)
  }

  // Show first 6 FAQs on homepage, rest can be viewed on FAQ page
  const featuredFAQs = faqs.slice(0, 6)

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="relative overflow-hidden">
        {/* Hero */}
        <section className="relative text-white" style={{ background: 'linear-gradient(to bottom right, #012c54, #014a7a, #016ba3)' }}>
          <div className="absolute inset-0 bg-grid-white/10" aria-hidden="true" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
            <div>
              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-7xl font-black leading-tight">
                Empowering Expert Tutors in the Jewish Community
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-white/90 max-w-3xl mx-auto">
                Join our elite network of educators and professionals. JTutors provides the tools,
                visibility, and support you need to build your tutoring practice effectively.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register?role=tutor"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-10 py-5 font-bold text-white shadow-2xl hover:scale-105 transition-all text-lg"
                  style={{ backgroundColor: '#f5a11a' }}
                >
                  Become a Tutor
                  <ChevronRight className="h-6 w-6" />
                </Link>
                <Link
                  to="/how-it-works-for-tutors"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-10 py-5 font-bold text-white bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all text-lg"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Highlights */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-black text-slate-900">Build Your Tutoring Career with JTutors</h2>
            <p className="mt-4 text-lg text-slate-600">
              The professional platform designed for high-impact educational growth.
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

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
                <p className="mt-2 text-slate-600">
                  Find answers to common questions about JTutors
                </p>
              </div>
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-[#012c54] hover:text-[#012c54] transition-colors"
              >
                View all FAQs
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {featuredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-900 pr-4">
                      {faq.question}
                    </span>
                    {openFAQIndex === index ? (
                      <ChevronUp className="h-5 w-5 text-slate-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-600 flex-shrink-0" />
                    )}
                  </button>
                  {openFAQIndex === index && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                      <p className="text-slate-700 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Question form */}
        <Footer />
      </main>
    </div>
  )
}

export default HomePage