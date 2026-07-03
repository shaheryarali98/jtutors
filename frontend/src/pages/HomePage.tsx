import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  GraduationCapIcon,
  LockKeyhole,
  GraduationCap,
  Laptop,
  MapPin,
  Medal,
  SearchCheck,
  ShieldCheck,
  Star,
  Video,
} from 'lucide-react'

const outcomes = [
  { icon: BarChart3, label: 'Improve Academic Performance' },
  { icon: ShieldCheck, label: 'Build Confidence & Motivation' },
  { icon: BookOpenCheck, label: 'Master Difficult Subjects' },
  { icon: ClipboardList, label: 'Stay on Track with School & Tests' },
  { icon: Medal, label: 'Achieve Long-Term Success' },
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
  'Columbia University (New York, NY)',
  'Bar-Ilan University (Ramat Gan, Israel)',
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

const marqueeDurationSeconds = Math.max(90, schoolNames.length * 1.5)

const expertTutors = [
  {
    name: 'Alan Poyurs',
    initials: 'AP',
    bio: 'My desire is to always create a comfortable working environment where students feel supported and confident.',
    location: 'Netanya',
    price: '$40',
    tags: ['Business', 'Writing', 'Prealgebra'],
    more: '+21 more',
    meta: '2 exp',
    languages: 'English',
    color: 'bg-[#123f70]',
  },
  {
    name: 'Ariella Fagin (Schreiber)',
    image: '/ariella.jpg',
    bio: "Hi! I'm Ariella, an LMSW with a passion for helping students build confidence and master new skills.",
    location: 'Woodmere, NY',
    price: '$70',
    tags: ['United States history', 'Navih', 'Proofreading'],
    more: '+10 more',
    meta: '2 exp',
    languages: 'English',
    color: 'bg-[#6b7fb0]',
  },
  {
    name: 'Josh Toledano',
    initials: 'JT',
    bio: 'I have multiple years of experience being a classroom teacher and helping students reach their goals.',
    location: 'Toronto , Ontario',
    price: '$75',
    tags: ['Prealgebra', 'Trigonometry', 'Statistics'],
    more: '+30 more',
    meta: '1 exp',
    languages: 'English',
    color: 'bg-[#123f70]',
  },
  {
    name: 'Devorah Weissman',
    image: '/devorah.jpg',
    bio: 'I am currently working from Jerusalem, Israel. My favorite part of tutoring is helping students grow.',
    location: 'Lawrence, New York',
    price: '$70',
    tags: ['Proofreading', 'Tefillah', 'Literacy'],
    more: '+11 more',
    meta: '3 exp',
    languages: 'English',
    color: 'bg-[#8aa7cf]',
  },
  {
    name: 'Ava Cohen',
    initials: 'AC',
    bio: 'Hi!! My name is Ava, and I am a college student with a strong love for helping students understand math.',
    location: 'Teaneck, NJ',
    price: '$25',
    tags: ['Algebra 1', 'Probability', 'Elementary math'],
    more: '+5 more',
    meta: '1 exp',
    languages: 'English',
    color: 'bg-[#123f70]',
  },
  {
    name: 'Avi Woolf',
    image: '/avi.jpg',
    bio: 'After twenty years in the world of publishing, editing, and translating, I help students write clearly.',
    location: 'New York City, New York',
    price: '$60',
    tags: ['Grammar', 'Vocabulary', 'Writing'],
    more: '+11 more',
    meta: '1 exp',
    languages: 'English, Hebrew',
    color: 'bg-[#687b91]',
  },
  {
    name: 'Ayelet Guttman',
    image: '/ayelet.jpg',
    bio: 'I am an experienced Judaic Studies tutor with over three years of classroom and private tutoring experience.',
    location: 'Fort Lauderdale, FL',
    price: '$50',
    tags: ['Tefillah', 'Halacha', 'Talmud'],
    more: '+3 more',
    meta: '1 exp',
    languages: 'English, Hebrew',
    color: 'bg-[#9cb2d6]',
  },
  {
    name: 'Yeruchum Rosenberg',
    image: '/yeruchum.jpg',
    bio: 'I tutor students in Bar Mitzvah preparation, Gemara, Chumash, and other core Judaic subjects.',
    location: 'teaneck, new jersey',
    price: '$125',
    tags: ['Jewish law', 'Talmud', 'Tanach'],
    more: '+7 more',
    meta: '',
    languages: 'Hebrew, English',
    color: 'bg-[#707070]',
  },
]

const dynamicFeatures = [
  {
    icon: GraduationCapIcon,
    title: 'Expert Tutors',
    body: 'JTutors connects students with experienced, diverse tutors across every major subject, learning goal, and budget.',
  },
  {
    icon: Laptop,
    title: 'Flexible Learning Options',
    body: 'Choose online tutoring with our own virtual classroom, in-person with local tutors, or a hybrid approach, with sessions that fit your schedule.',
  },
  {
    icon: Video,
    title: 'Virtual Classroom & Recorded Sessions',
    body: "Our virtual classroom offers online whiteboards, file sharing and records all sessions, supporting ongoing review and integration with the student's teacher.",
  },
  {
    icon: CalendarRange,
    title: 'All-in-One Scheduling',
    body: 'Book, reschedule, and manage sessions directly on JTutors. No extra emails or tools required.',
  },
  {
    icon: LockKeyhole,
    title: 'Safe & Secure',
    body: "Built-in messaging, secure payments, and dedicated support for the Jewish community's learning needs.",
  },
  {
    icon: SearchCheck,
    title: 'Customised Search & Matching',
    body: 'Advanced filters by subject, grade, location, learning style, and tutor background help you find the perfect match instantly.',
  },
]

const faqQuestions = [
  'What is JTutors?',
  'What is a tutoring marketplace?',
  'What is a tutoring platform?',
  'What subjects are available on JTutors?',
  'Can tutors work with groups or only individual students?',
  'What tools does JTutors provide for tutoring?',
]

type TutorAvatarProps = {
  name: string
  image?: string
  initials?: string
  color?: string
}

const TutorAvatar = ({ name, image, initials, color = 'bg-[#123f70]' }: TutorAvatarProps) => {
  const [src, setSrc] = useState(image ?? '')
  const [showFallback, setShowFallback] = useState(!image)
  const [attempt, setAttempt] = useState(0)

  const handleError = () => {
    if (!image) {
      setShowFallback(true)
      return
    }

    if (attempt === 0) {
      setSrc(image.replace(/\.jpg$/i, '.png'))
      setAttempt(1)
      return
    }

    if (attempt === 1) {
      setSrc(image + '.png')
      setAttempt(2)
      return
    }

    setShowFallback(true)
  }

  if (showFallback || !src) {
    return (
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white ${color} text-2xl font-black text-white shadow-[0_10px_22px_rgba(15,49,91,0.18)]`}
        aria-label={name}
      >
        {initials || name.split(' ').map((n) => n[0]).join('').toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-[0_10px_22px_rgba(15,49,91,0.18)]"
      onError={handleError}
    />
  )
}

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#f5f8fc] text-[#071b36]">
      <style>
        {`
          @keyframes school-marquee {
            0% {
              transform: translate3d(0, 0, 0);
            }
            100% {
              transform: translate3d(-50%, 0, 0);
            }
          }

          @keyframes marquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-100%);
            }
          }

          .animate-marquee {
            animation: marquee ${marqueeDurationSeconds}s linear infinite;
          }
        `}
      </style>

      <main>
        <section className="flex w-full flex-col bg-white lg:min-h-[calc(100vh-88px)]">
          <header className="h-16 w-full border-b border-[#eceff3] bg-white">
            <div className="mx-auto flex h-full max-w-[1320px] items-center justify-between px-6">
              <Link to="/" className="flex shrink-0 items-center gap-1">
                <span className="text-[26px] font-black leading-none text-[#f5a11a]">J</span>
                <span className="text-[26px] font-black leading-none text-[#0b315d]">Tutors</span>
                <GraduationCap className="ml-1 h-5 w-5 text-[#0b315d]" strokeWidth={2.2} />
              </Link>

              <div className="flex items-center gap-8">
                <nav className="hidden items-center rounded-full border border-[#e8edf3] bg-[#f7f8fb] px-5 py-2 text-[11px] font-medium text-[#182535] shadow-[0_1px_4px_rgba(16,24,40,0.04)] lg:flex">
                  <Link to="/our-team" className="whitespace-nowrap px-4 transition hover:text-[#0B3B60]">
                    Our Team
                  </Link>
                  <Link
                    to="/how-it-works-for-students"
                    className="flex items-center gap-1 whitespace-nowrap px-4 transition hover:text-[#0B3B60]"
                  >
                    <span>How it Works</span>
                    <ChevronDown className="h-3 w-3" />
                  </Link>
                  <Link
                    to="/how-it-works-for-tutors"
                    className="whitespace-nowrap px-4 transition hover:text-[#0B3B60]"
                  >
                    For Tutors
                  </Link>
                  <Link
                    to="/how-it-works-for-students"
                    className="whitespace-nowrap px-4 transition hover:text-[#0B3B60]"
                  >
                    For Students
                  </Link>
                  <Link
                    to="/browse-tutors"
                    className="whitespace-nowrap px-4 transition hover:text-[#0B3B60]"
                  >
                    Browse Tutors
                  </Link>
                </nav>

                <Link
                  to="/login"
                  className="hidden text-[11px] font-medium text-[#162333] transition hover:text-[#0B3B60] lg:inline-flex"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="hidden h-8 items-center justify-center rounded-md bg-[#f2aa2a] px-4 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(242,170,42,0.28)] transition hover:bg-[#e29c1d] lg:inline-flex"
                >
                  Join JTutors
                </Link>
              </div>
            </div>
          </header>

          <section className="flex flex-grow flex-col justify-center bg-gradient-to-b from-[#0e2d52] via-[#133b66] to-[#0e2d52] py-10 text-white lg:py-12">
            <div
              className="mx-auto flex w-full max-w-[1320px] items-center px-6 py-20 md:py-24 lg:py-28"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 40%, rgba(66,110,164,0.22) 0%, rgba(66,110,164,0) 52%)',
              }}
            >
              <div className="mx-auto text-center space-y-8" style={{ maxWidth: '860px' }}>
                <h1
                  className="text-4xl font-extrabold tracking-tight text-white antialiased md:text-5xl lg:text-6xl"
                  style={{
                    lineHeight: '1.06',
                    letterSpacing: '0',
                    margin: 0,
                  }}
                >
                  JTutors: Connecting Jewish
                  <br />
                  Tutors and Students
                </h1>
                <p
                  className="mx-auto text-[16px] font-medium leading-9 text-white/88 antialiased md:text-[18px]"
                  style={{
                    maxWidth: '760px',
                  }}
                >
                  JTutors is an innovative tutoring platform that connects students with qualified tutors
                  for personalized learning, online or in person. Offering tutoring in all subjects with
                  interactive online classrooms, easy scheduling, and secure payments, JTutors makes
                  tutoring simple, flexible, and engaging.
                </p>

                <div className="mt-8 flex flex-col items-center gap-3.5">
                  <Link
                    to="/browse-tutors"
                    className="w-60 rounded-xl bg-[#f5a623] px-8 py-3.5 text-center text-base font-bold text-white shadow-[0_4px_14px_rgba(245,166,35,0.4)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#e09216] active:scale-[0.98]"
                  >
                    Find a Tutor
                  </Link>

                  <Link
                    to="/how-it-works-for-students"
                    className="w-44 rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-center text-sm font-medium text-slate-300 shadow-sm transition-all duration-200 hover:border-white/30 hover:bg-white/15 hover:text-white"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <div className="relative w-full overflow-hidden bg-[#030d1a] py-6">
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-24 bg-gradient-to-r from-[#030d1a] to-transparent" />
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-24 bg-gradient-to-l from-[#030d1a] to-transparent" />

            <div className="mb-5 text-center text-xs font-bold uppercase tracking-widest text-[#f5a623]">
              Students and Educators From Institutions Including
            </div>

            <div className="flex w-full select-none overflow-hidden">
              <div className="animate-marquee flex min-w-full shrink-0 justify-around gap-6 whitespace-nowrap pr-6">
                {schoolNames.map((item) => (
                  <span
                    key={`ticker-a-${item}`}
                    className="rounded-full border border-slate-800/80 bg-slate-900/60 px-5 py-2 text-sm text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div
                className="animate-marquee flex min-w-full shrink-0 justify-around gap-6 whitespace-nowrap pr-6"
                aria-hidden="true"
              >
                {schoolNames.map((item) => (
                  <span
                    key={`ticker-b-${item}`}
                    className="rounded-full border border-slate-800/80 bg-slate-900/60 px-5 py-2 text-sm text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full bg-[#f4f8fc]">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 fill-[#f5a11a] text-[#f5a11a]" strokeWidth={2} />
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f315b]">Our Tutors</p>
                </div>
                <h2 className="mt-4 text-[32px] font-black leading-tight text-[#19233b] md:text-[42px]">
                  Meet Our Expert Tutors
                </h2>
                <p className="mt-3 max-w-2xl text-[16px] font-medium leading-7 text-[#58677e]">
                  Verified educators ready to help you succeed in your academic journey.
                </p>
              </div>

              <Link
                to="/browse-tutors"
                className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-full border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-[#0f315b] hover:text-[#0f315b] lg:self-auto"
              >
                Browse All Tutors
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {expertTutors.map((tutor) => (
                <article
                  key={tutor.name}
                  className="overflow-hidden rounded-3xl border border-[#dbe5ef] bg-white shadow-[0_10px_24px_rgba(15,49,91,0.10)]"
                >
                  <div className="h-28 bg-[linear-gradient(110deg,#12345f_0%,#4d32cf_52%,#3d486d_100%)]" />

                  <div className="-mt-10 flex justify-center">
                    <TutorAvatar
                      name={tutor.name}
                      image={tutor.image}
                      initials={tutor.initials}
                      color={tutor.color}
                    />
                  </div>

                  <div className="px-6 pb-5 pt-4 text-center">
                    <h3 className="min-h-[48px] text-[19px] font-black leading-6 text-[#172039]">{tutor.name}</h3>
                    <p
                      className="mx-auto mt-2 min-h-[48px] max-w-[220px] text-[13px] font-medium leading-6 text-[#536177]"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {tutor.bio}
                    </p>

                    <div className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-medium text-[#6b7890]">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
                      <span>{tutor.location}</span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-center gap-2">
                      <span className="text-xl font-medium text-[#16a34a]">$</span>
                      <span className="text-[19px] font-black text-[#172039]">{tutor.price.replace('$', '')}</span>
                      <span className="text-[13px] font-medium text-[#4f6079]">/hr</span>
                    </div>

                    <div className="mt-4 flex min-h-[54px] flex-wrap items-start justify-center gap-2">
                      {tutor.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#e8f2fb] px-3 py-1 text-[11px] font-medium text-[#0d3765]"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="rounded-full bg-[#f0f4f8] px-3 py-1 text-[11px] font-medium text-[#617089]">
                        {tutor.more}
                      </span>
                    </div>

                    <div className="mt-4 flex min-h-[20px] items-center justify-center gap-4 text-[12px] font-medium text-[#64748b]">
                      {tutor.meta && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} />
                          {tutor.meta}
                        </span>
                      )}
                      <span>{tutor.languages}</span>
                    </div>
                  </div>

                  <Link
                    to="/browse-tutors"
                    className="flex h-14 items-center justify-center border-t border-[#edf1f5] text-sm font-black text-[#0d315f] transition hover:bg-[#f8fbff]"
                  >
                    View Profile -&gt;
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-[25px] font-black md:text-[30px]">Better Grades. More Confidence. Less Stress.</h2>
            <p className="mt-3 text-base font-medium text-[#274260]">
              We help your child reach their full potential with the right tutor by their side.
            </p>
            <div className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-3 xl:grid-cols-5">
              {outcomes.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center rounded-2xl border border-[#e6edf5] bg-[#fbfdff] px-5 py-6">
                  <Icon className="h-10 w-10 text-[#064b86]" strokeWidth={1.8} />
                  <p className="mt-4 text-sm font-black leading-6">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full bg-white py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-center text-[44px] font-black leading-tight text-[#19233b]">
              What makes JTutors so dynamic?
            </h2>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {dynamicFeatures.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-[28px] border border-[#d9e1ec] bg-[#f8fbff] px-6 py-7 shadow-[0_6px_18px_rgba(17,34,68,0.05)]"
                >
                  <Icon className="h-5 w-5 text-[#2c5788]" strokeWidth={2} />
                  <h3 className="mt-5 text-[20px] font-black leading-9 text-[#1b2340]">{title}</h3>
                  <p className="mt-3 text-[15px] font-medium leading-9 text-[#5d6880]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full bg-white py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-[44px] font-black leading-tight text-[#19233b]">
                  Frequently Asked Questions
                </h2>
                <p className="mt-2 text-[15px] font-medium text-[#5e6982]">
                  Find answers to common questions about JTutors
                </p>
              </div>

              <Link
                to="/faq"
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full border border-[#cfd9e6] bg-white px-5 text-[15px] font-medium text-[#2a3551] transition hover:bg-[#f7fafe] md:self-auto"
              >
                View all FAQs
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {faqQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-[#d8e1ec] bg-white px-6 py-7 text-left shadow-[0_4px_14px_rgba(17,34,68,0.04)] transition hover:border-[#c4d1e0]"
                >
                  <span className="pr-6 text-[16px] font-semibold text-[#1f2942]">{question}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-[#42506b]" strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full bg-[#264d78] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mx-auto max-w-4xl rounded-[28px] bg-[rgba(96,138,184,0.45)] px-10 py-12 shadow-[0_18px_60px_rgba(10,30,60,0.22)] backdrop-blur-sm">
              <h2 className="text-left text-[42px] font-black leading-tight text-white">
                Didn&apos;t find your question here?
              </h2>
              <p className="mt-3 max-w-3xl text-[15px] font-medium leading-8 text-blue-100">
                Check out our{' '}
                <Link
                  to="/faq"
                  className="text-white underline decoration-white/50 underline-offset-4 transition-colors hover:text-blue-200"
                >
                  FAQ page
                </Link>{' '}
                for more answers, or send us your question and our team will respond within 24 hours.
              </p>

              <form className="mt-8 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Full name"
                    className="h-12 rounded-2xl border border-white/30 bg-[rgba(123,161,201,0.28)] px-4 text-[15px] font-medium text-white placeholder:text-white/75 outline-none transition focus:border-white/60"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    className="h-12 rounded-2xl border border-white/30 bg-[rgba(123,161,201,0.28)] px-4 text-[15px] font-medium text-white placeholder:text-white/75 outline-none transition focus:border-white/60"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Question subject"
                  className="h-12 w-full rounded-2xl border border-white/30 bg-[rgba(123,161,201,0.28)] px-4 text-[15px] font-medium text-white placeholder:text-white/75 outline-none transition focus:border-white/60"
                />

                <textarea
                  placeholder="Describe how we can help"
                  rows={5}
                  className="w-full rounded-2xl border border-white/30 bg-[rgba(123,161,201,0.28)] px-4 py-4 text-[15px] font-medium text-white placeholder:text-white/75 outline-none transition focus:border-white/60"
                />

                <label className="flex items-center gap-3 pt-1 text-[14px] font-medium text-white/92">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/60 bg-transparent text-white accent-white"
                  />
                  <span>I have read and agree to all Terms & Conditions.</span>
                </label>

                <button
                  type="submit"
                  className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-[18px] font-semibold text-[#ef9f18] transition hover:bg-[#f7fbff]"
                >
                  Submit your question
                  <ChevronRight className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="w-full bg-[#003f70] py-8 text-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col items-center justify-between gap-5 md:flex-row">
            <div>
              <h2 className="text-[28px] font-black">Let&apos;s Find the Right Tutor for Your Child</h2>
              <p className="mt-2 text-lg font-medium text-white/88">Personalized matching. Expert tutors. Real results.</p>
            </div>
            <Link
              to="/browse-tutors"
              className="inline-flex h-14 min-w-[240px] items-center justify-center gap-3 rounded-md bg-[#ff9f16] px-8 text-base font-black text-white shadow-[0_12px_26px_rgba(0,0,0,0.16)] transition hover:bg-[#f18d00]"
            >
              Find My Tutor
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default HomePage
