import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  DollarSign,
  BookOpen,
  Star,
} from 'lucide-react'
import { faqs } from '../constants/faqs'
import api from '../lib/api'
import { resolveImageUrl } from '../lib/media'

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
      'Choose online tutoring with our own virtual classroom, in-person with local tutors, or a hybrid approach, sessions that fit your schedule.',
  },
  {
    title: 'Virtual Classroom & Recorded Sessions',
    description:
      "Our virtual classroom offers online whiteboards, file sharing and records all sessions, supporting ongoing review and integration with the student's teacher.",
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

const schoolNames = [
  'Temple Beth Sholom (Melbourne, FL)',
  'Ramaz Upper School (New York, NY)',
  'Torah Academy of Minneapolis (Minneapolis, MN)',
  'Hebrew Academy of Long Beach (Woodmere, NY)',
  'Gann Academy (Waltham, MA)',
  'Meorot Yerushalayim (Jerusalem, Israel)',
  'Katz Hillel Day School (Boca Raton, FL)',
  'RPRY (Edison, NJ)',
  'Princeton University (Princeton, NJ)',
  'Farber Hebrew Day School (Detroit, MI)',
  'Joseph Kushner Hebrew Academy (Livingston, NJ)',
  'The Leffell School (Hartsdale, NY)',
  'Harvard University (Cambridge, MA)',
  'Torah Day School (Atlanta, GA)',
  'Midreshet HaRova (Jerusalem, Israel)',
  'Shalhevet School for Girls (Cedarhurst, NY)',
  'Hillel Yeshiva (Deal, NJ)',
  'OU-JLIC (Champaign, IL)',
  'Columbia University (New York, NY)',
  'Bar-Ilan University (Ramat Gan, Israel)',
  'Bruriah High School (Elizabeth, NJ)',
  'Chabad at Columbia University (New York, NY)',
  'Bobov Yeshiva (Brooklyn, NY)',
  'Maimonides School (Brookline, MA)',
  'The Frisch School (Paramus, NJ)',
  'Hebrew Academy (Margate, FL)',
  'Machon Maayan (Jerusalem, Israel)',
  'TABC (Teaneck, NJ)',
  'Manhattan Day School (New York, NY)',
  'Touro College (Jerusalem, Israel)',
  'Beth El Synagogue (East Windsor, NJ)',
  'Hillel Academy of Pittsburgh (Pittsburgh, PA)',
  'Temple Sholom Hebrew Club (Vancouver, BC, Canada)',
  'Westchester Hebrew High School (Mamaroneck, NY)',
  'The Shaar (New York, NY)',
  'Heichal HaTorah (Teaneck, NJ)',
  'TTI / Raizel Reit (New York, NY)',
  'Tashbar (Baltimore, MD)',
  'Bnos Malka Academy (Queens, NY)',
  'Sinai Academy (Brooklyn, NY)',
  'Congregation Shearith Israel (New York, NY)',
  'Midreshet Torat Chessed (Netanya, Israel)',
  'Edah Studio 70 (Berkeley, CA)',
  "Sharfman's Seminary (Jerusalem, Israel)",
  'Maalot High School (Lakewood, NJ)',
  'Vesoiday HaTorah Primary School (Manchester, England)',
  'Stern College for Women (New York, NY)',
  'Tiferes Moshe Academy (Queens, NY)',
  "Na'aleh High School for Girls (Fair Lawn, NJ)",
  'Bais Tzipra of Manhattan (New York, NY)',
  'Yeshiva Ohr Yisrael (Boston, MA)',
  'Bi-Cultural Hebrew Academy (Stamford, CT)',
  'Congregation Bnai Shalom (Walnut Creek, CA)',
  'Emek Hebrew Academy (Los Angeles, CA)',
  'Yeshiva Rabbi Samson Raphael Hirsch (New York, NY)',
  'Yeshiva of Central Queens (Queens, NY)',
  'The Moriah School (Englewood, NJ)',
  'Yeshiva University High School for Girls (Hollis, NY)',
  'Westchester Day School (Westchester, NY)',
  'Lubavitch Girls High School (Chicago, IL)',
  'Seattle Hebrew Academy (Seattle, WA)',
  'JEC (Elizabeth, NJ)',
  'Congregation Beth Shalom Olney (Baltimore, MD)',
  'Hannah Sacks Bais Yaakov (Chicago, IL)',
  'Young Israel of Oceanside (Oceanside, NY)',
  'Beit Rabban Day School (New York, NY)',
  'Yeshivas Darchei Torah (Detroit, MI)',
  'Eitz Chaim (Toronto, ON, Canada)',
  'Abraham Joshua Heschel School (New York, NY)',
  'Hasmonean High School for Girls (London, England)',
  'Scheck Hillel Community Day School (Miami, FL)',
  'Ivry Prozdor High School (New York, NY)',
  'Mesivta Yesodei Yeshurun (Flushing, NY)',
  'Brauser Maimonides Academy (Hollywood, FL)',
  'Fasman Yeshiva High School (Skokie, IL)',
  'Torah Day School of Seattle (Seattle, WA)',
  'RYNJ (Paramus, NJ)',
  'Yeshivat Noam (Paramus, NJ)',
  'Atlanta Jewish Academy (Atlanta, GA)',
  'Yeshiva University (New York, NY)',
  'Touro College (New York, NY)',
  'Hebrew Academy of Miami Beach (Miami Beach, FL)',
  'Ateret Crown Hebrew Day School (Skokie, IL)',
  'Zucker Academy (Brooklyn, NY)',
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

interface PublicTutor {
  id: string
  firstName: string | null
  lastName: string | null
  profileImage: string | null
  coverImage: string | null
  tagline: string | null
  hourlyFee: number | null
  city: string | null
  state: string | null
  country: string | null
  languagesSpoken: string[]
  gradesCanTeach: string[]
  subjects: string[]
  experienceCount: number
  educationCount: number
}

const HomePage = () => {
  const { user } = useAuthStore()
  const browseTutorsUrl = '/browse-tutors'
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null)
  const [featuredTutors, setFeaturedTutors] = useState<PublicTutor[]>([])
  const [loadingTutors, setLoadingTutors] = useState(true)

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const res = await api.get('/public/tutors?limit=8')
        setFeaturedTutors(res.data.tutors)
      } catch (err) {
        console.error('Failed to load featured tutors:', err)
      } finally {
        setLoadingTutors(false)
      }
    }
    fetchTutors()
  }, [])

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
                JTutors: Connecting Jewish Tutors and Students
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-white/90 max-w-3xl mx-auto">
                JTutors is an innovative tutoring platform that connects students with qualified tutors
                for personalized learning, online or in person. Offering tutoring in all subjects with
                interactive online classrooms, easy scheduling, and secure payments, JTutors makes
                tutoring simple, flexible, and engaging.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
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

        {/* Schools */}
        <section className="bg-slate-950 py-10 text-white overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm font-bold uppercase tracking-wide text-[#f5a11a]">
              Students and educators from institutions including
            </p>
          </div>
          <div className="school-marquee mt-7" aria-label="School and community names">
            <div className="school-marquee-track">
              {[...schoolNames, ...schoolNames].map((school, index) => (
                <span
                  key={`${school}-${index}`}
                  className="mx-3 inline-flex rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white/90"
                >
                  {school}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Tutors */}
        <section className="py-16" style={{ background: 'linear-gradient(to bottom, #f8fafc, #e6f0f7)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-bold uppercase tracking-wide" style={{ color: '#012c54' }}>Our Tutors</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900">Meet Our Expert Tutors</h2>
                <p className="mt-2 text-slate-600">
                  Verified educators ready to help you succeed in your academic journey.
                </p>
              </div>
              {(user?.role === 'STUDENT' || !user) && (
                <Link
                  to={browseTutorsUrl}
                  className="inline-flex items-center gap-2 rounded-full border-2 px-6 py-3 text-sm font-bold transition-all hover:scale-105"
                  style={{ borderColor: '#012c54', color: '#012c54' }}
                >
                  Browse All Tutors
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            {loadingTutors ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-3xl bg-white p-6 shadow-sm animate-pulse">
                    <div className="h-20 w-20 mx-auto rounded-full bg-slate-200" />
                    <div className="mt-4 h-4 bg-slate-200 rounded w-3/4 mx-auto" />
                    <div className="mt-2 h-3 bg-slate-200 rounded w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            ) : featuredTutors.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featuredTutors.map((tutor) => {
                  const coverImage = resolveImageUrl(tutor.coverImage || '')
                  const profileImage = resolveImageUrl(tutor.profileImage || '')
                  return (
                  <div
                    key={tutor.id}
                    className="group rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Cover Banner */}
                    <div className="h-32 bg-gradient-to-r from-[#012c54] via-indigo-700 to-slate-700 relative overflow-hidden">
                      {coverImage ? (
                        <img src={coverImage} alt="Cover" className="h-full w-full object-cover" />
                      ) : null}
                    </div>

                    {/* Tutor Card */}
                    <div className="p-6 text-center">
                      {/* Avatar */}
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt={`${tutor.firstName} ${tutor.lastName}`}
                          className="h-24 w-24 mx-auto rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div
                          className="h-24 w-24 mx-auto rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                          style={{ background: 'linear-gradient(to bottom right, #012c54, #014a7a)' }}
                        >
                          {tutor.firstName?.[0] || '?'}{tutor.lastName?.[0] || ''}
                        </div>
                      )}

                      {/* Name & Tagline */}
                      <h3 className="mt-4 text-lg font-bold text-slate-900">
                        {tutor.firstName} {tutor.lastName}
                      </h3>
                      {tutor.tagline && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{tutor.tagline}</p>
                      )}

                      {/* Location */}
                      {(tutor.city || tutor.state) && (
                        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {[tutor.city, tutor.state].filter(Boolean).join(', ')}
                        </div>
                      )}

                      {/* Fee */}
                      {tutor.hourlyFee && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-lg font-bold text-slate-900">${tutor.hourlyFee}</span>
                          <span className="text-xs text-slate-500">/hr</span>
                        </div>
                      )}

                      {/* Subjects */}
                      {tutor.subjects.length > 0 && (
                        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                          {tutor.subjects.slice(0, 3).map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#e6f0f7', color: '#012c54' }}>
                              {s}
                            </span>
                          ))}
                          {tutor.subjects.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                              +{tutor.subjects.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                        {tutor.experienceCount > 0 && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {tutor.experienceCount} exp
                          </span>
                        )}
                        {tutor.languagesSpoken.length > 0 && (
                          <span>{tutor.languagesSpoken.slice(0, 2).join(', ')}</span>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="border-t border-slate-100 px-6 py-3">
                      <Link
                        to={user?.role === 'STUDENT' ? `/student/tutor/${tutor.id}` : `/register?role=student`}
                        className="block text-center text-sm font-bold transition-colors"
                        style={{ color: '#012c54' }}
                      >
                        View Profile →
                      </Link>
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 rounded-3xl bg-white border border-slate-200">
                <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">Tutors Coming Soon</h3>
                <p className="text-slate-500 mt-2">
                  Our tutors are building their profiles. Check back soon!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Platform Highlights */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-black text-slate-900">What makes JTutors so dynamic?</h2>

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
