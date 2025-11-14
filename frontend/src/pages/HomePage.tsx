import { motion } from 'framer-motion'
import { 
  GraduationCap, 
  CalendarCheck, 
  MessageSquare, 
  Search, 
  Shield, 
  Users,
  ArrowRight,
  Sparkles,
  BookOpen,
  Trophy,
  Zap,
  Heart,
  Star,
  
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { NavLink } from 'react-router-dom'
import Footer from '../components/Footer'

const HomePage = () => {

  const features = [
    {
      icon: GraduationCap,
      title: "Expert Tutors",
      desc: "JTutors connects students with experienced and diverse tutors across a wide range of subjects, ages, and budgets.",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600"
    },
    {
      icon: CalendarCheck,
      title: "Flexible Learning Options",
      desc: "Choose online via Zoom integration, in-person with local tutors, or a combination of both.",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      icon: MessageSquare,
      title: "Seamless Communication & Replay",
      desc: "Google Classroom integration keeps students, tutors, teachers, and parents connected, while recorded sessions allow students to review lessons anytime.",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      icon: Users,
      title: "All-in-One Scheduling",
      desc: "Book, reschedule, and manage sessions directly on the site—no extra apps, emails, or back-and-forth required.",
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50",
      iconColor: "text-red-600"
    },
    {
      icon: Shield,
      title: "Safe & Secure",
      desc: "Built-in messaging, secure payments, and a platform designed for the Jewish community.",
      color: "from-teal-500 to-cyan-500",
      bgColor: "bg-teal-50",
      iconColor: "text-teal-600"
    },
    {
      icon: Search,
      title: "Customized Search & Matching",
      desc: "Advanced filters by subject, grade level, location, learning style, and tutor background help you find your perfect match instantly.",
      color: "from-indigo-500 to-purple-500",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600"
    }
  ];

  const stats = [
    { value: "4.9/5", label: "Average tutor rating", icon: Star, color: "from-blue-400 to-purple-500" },
    { value: "120+", label: "Subjects covered", icon: BookOpen, color: "from-cyan-400 to-blue-500" },
    { value: "3k+", label: "Learners supported", icon: Users, color: "from-purple-400 to-pink-500" },
    { value: "98%", label: "Parent satisfaction", icon: Heart, color: "from-blue-500 to-indigo-500" }
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i:number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.6,
        ease: [0.25, 0.4, 0.25, 1]
      }
    })
  };

  // const floatingAnimation = {
  //   y: [0, -20, 0],
  //   transition: {
  //     duration: 3,
  //     repeat: Infinity,
  //     ease: "easeInOut"
  //   }
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 overflow-hidden">
      <Navbar/>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-300 to-cyan-300 rounded-full blur-3xl"
        />
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold uppercase tracking-wide shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Welcome to JTutor
            </motion.span>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 leading-tight"
            >
              Where Jewish Students and Tutors Connect
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-lg text-slate-700 leading-relaxed font-medium"
            >
             JTutors connects students and families with trusted, vetted tutors who understand the academic needs of the Jewish community.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <NavLink to="/register?role=student" className="group relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105">
                <span className="relative z-10 flex items-center">
                  Explore Tutors
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </NavLink>
              
              <NavLink to="/register?role=teacher" className="group bg-white text-violet-600 font-bold text-base px-8 py-4 rounded-2xl shadow-xl border-2 border-violet-200 hover:border-violet-400 hover:shadow-2xl hover:shadow-violet-200 transition-all duration-300 hover:scale-105">
                <span className="flex items-center">
                  Apply as a Tutor
                  <Zap className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
                </span>
              </NavLink>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="relative group"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-20 group-hover:opacity-30 rounded-2xl transition-opacity duration-300`} />
                    <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-white/50 group-hover:shadow-2xl transition-all duration-300">
                      <Icon className={`w-6 h-6 mb-2 text-slate-600`} />
                      <p className={`text-2xl font-black bg-gradient-to-r ${stat.color} text-transparent bg-clip-text`}>{stat.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-slate-600 font-semibold">{stat.label}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <motion.div
              // animate={{floatingAnimation}}
              className="relative"
            >
              <div className="absolute -top-8 -left-8 w-80 h-80 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full blur-3xl opacity-40 animate-pulse" />
              <div className="absolute -bottom-8 -right-8 w-80 h-80 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '1s' }} />
              
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 backdrop-blur-sm transform hover:scale-105 transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80"
                  alt="Students learning together"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent" />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="absolute top-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-900">98%</p>
                      <p className="text-xs text-slate-600 font-semibold">Success Rate</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 bg-gradient-to-br from-white via-violet-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-blue-600 to-purple-600 mb-6"
            >
              JTutors – A Revolutionary Jewish Tutoring Platform
            </motion.h1>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-3xl font-bold text-blue-600 mb-6"
            >
              Find your perfect tutor today—<br className="sm:hidden" /> online, in person, or both!
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-base text-slate-700 max-w-4xl mx-auto leading-relaxed"
            >
              JTutors connects students and families with trusted tutors who understand the academic needs of the Jewish community. 
              With flexible options for online, in-person, and hybrid learning, JTutors makes tutoring seamless, affordable, safe, and tailored to every learner.
            </motion.p>
          </motion.div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={{cardVariants}}
                  whileHover={{ y: -12, scale: 1.02 }}
                  className="group relative"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300`} />
                  <div className={`relative ${feature.bgColor} rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white/50 backdrop-blur-sm h-full`}>
                    <div className="flex items-start space-x-4">
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                        className={`w-14 h-14 ${feature.iconColor} flex items-center justify-center rounded-2xl bg-white shadow-lg group-hover:shadow-xl`}
                      >
                        <Icon className="w-7 h-7" />
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="text-lg font-black text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-200">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

         
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto text-center px-4"
        >
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="text-lg text-purple-100 mb-10">
            Join thousands of students and tutors transforming education together
          </p>
          <NavLink to="/register" className="group bg-white text-violet-600 font-bold text-base px-10 py-4 rounded-full shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-105">
            <span className="flex items-center justify-center">
              Get Started Now
              <Sparkles className="ml-3 w-5 h-5 group-hover:rotate-12 transition-transform" />
            </span>
          </NavLink>
        </motion.div>
      </section>

     <Footer/>
    </div>
  )
}

export default HomePage