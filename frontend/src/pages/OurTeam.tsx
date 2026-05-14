import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const founders = [
  {
    name: 'Rabbi Dr. Joshua Strulowitz',
    title: 'Co-Founder',
    image: '/team/joshua-strulowitz.png',
    imageAlt: 'Rabbi Dr. Joshua Strulowitz headshot',
    bio:
      'Rabbi Dr. Joshua Strulowitz is an experienced educator, administrator, and Rabbi with more than two decades of leadership in schools, synagogues, and community organizations. He currently serves as General Studies Principal at Heichal HaTorah in Teaneck, NJ, where he oversees the General Studies program, faculty development and college guidance. Previously, he served as Department Chair at Yeshiva University High School for Girls (Central), where he led curriculum innovation, faculty mentorship, and interdisciplinary educational initiatives. Earlier in his career, he held Rabbinic leadership positions in the Upper West Side and San Francisco, where he grew communities, developed educational programming, and led major communal initiatives. Dr. Strulowitz holds an Ed.D. in Educational Leadership from Yeshiva University, Semicha from RIETS (Yeshiva University) and an MA in Medieval Jewish history from the Bernard Revel school of Jewish Education. He is passionate about building strong school cultures, fostering meaningful relationships, and creating thoughtful, student-centered educational experiences. He lives in Passaic, NJ with his wife and five children.',
  },
  {
    name: 'Rebecca Lopkin',
    title: 'Co-Founder',
    image: '/team/rebecca-lopkin.jpg',
    imageAlt: 'Rebecca Lopkin portrait',
    bio:
      'Rebecca Lopkin is an award-winning educator, teaching artist, director, and founder of Envision Theater with nearly three decades of experience working with students in grades 3-12. She holds both a B.S. and M.A. in Educational Theater from New York University and is passionate about helping students build confidence, creativity, communication skills, and academic success through engaging, personalized instruction. Since founding Envision Theater in 2013, she has developed arts education programs and partnerships with more than 15 schools and camps across New York and New Jersey, while mentoring teaching artists and directing productions. Rebecca currently serves as Director of Performing Arts at Torah Academy of Bergen County and is also a longtime Teaching Artist with Lincoln Center Theater. Her innovative work includes founding Envision Shakespeare and creating the Bare Witness Project, and in 2023 she was honored as Educator of the Year by the Teaneck Chamber of Commerce. She lives in Teaneck, NJ with her husband and three children.',
  },
]

const OurTeam = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fafc_0%,#eef5fb_45%,#ffffff_100%)]">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,#012c54_0%,#014a7a_58%,#f5a11a_160%)] text-white">
          <div className="absolute inset-0 opacity-10" aria-hidden="true">
            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,white_0,transparent_35%),radial-gradient(circle_at_bottom_right,white_0,transparent_30%)]" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr),minmax(280px,0.8fr)] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">Our Team</p>
                <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  Built by educators who understand what families and students need
                </h1>
                <p className="mt-6 text-lg leading-8 text-white/88 sm:text-xl">
                  JTutors was founded by experienced Jewish educators who saw a vital need to create a Jewish tutoring platform and marketplace. JTutors&apos; mission is to provide high-quality, affordable and trusted tutors to the entire community, allowing every student to have access to an excellent education.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">Why JTutors</p>
                <div className="mt-5 space-y-4 text-sm leading-7 text-white/90">
                  <p>Trusted Jewish educators building a platform for students, families, and tutors.</p>
                  <p>High-quality tutoring that stays personal, community-centered, and accessible.</p>
                  <p>A marketplace designed to make excellent education easier to find and easier to trust.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mt-12 space-y-10">
            {founders.map((founder) => (
              <article
                key={founder.name}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(1,44,84,0.08)]"
              >
                <div className="grid gap-0 lg:grid-cols-[320px,1fr]">
                  <div className="border-slate-200 bg-[linear-gradient(180deg,#edf4fb_0%,#f8fbfe_100%)] p-6 sm:p-8 lg:border-r">
                    <div className="flex h-full items-center justify-center">
                      <div className="relative h-80 w-80 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl">
                        <img
                          src={founder.image}
                          alt={founder.imageAlt}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-8 sm:p-10 lg:p-12">
                    <div className="inline-flex rounded-full bg-amber-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.24em] text-amber-800">
                      {founder.title}
                    </div>
                    <h2 className="mt-5 text-3xl font-black text-slate-900 sm:text-[2.2rem]">{founder.name}</h2>
                    <div className="mt-6 h-1 w-16 rounded-full bg-[#f5a11a]" />
                    <p className="mt-6 text-base leading-8 text-slate-700 sm:text-[1.02rem]">{founder.bio}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default OurTeam