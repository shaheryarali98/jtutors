// HowItWorksTutors.jsx
import { motion, Variants } from 'framer-motion';
import {
  CheckCircle2,
  ArrowRight,
  Star,
  Check,
  Sparkles,
  UserCheck,
  Calendar,
  Video,
  DollarSign,
  GraduationCap
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { NavLink } from 'react-router-dom';

// Animation Variants
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: 'easeInOut',
    }
  })
};

const iconRotate = {
  hover: { rotate: 360, transition: { duration: 0.6 } }
};

const HowItWorksTutors = () => {
  const steps = [
    {
      step: "01",
      title: "Apply & Get Approved",
      desc: "Submit your application and tell us about your background, teaching experience, and subjects of expertise. Every tutor is reviewed and vetted to ensure quality and professionalism.",
      icon: UserCheck,
      gradient: "from-purple-500 to-violet-500",
      bg: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      step: "02",
      title: "Set Up Your Profile",
      desc: "Create a profile that highlights your expertise, teaching style, and educational philosophy. This is your chance to showcase your strengths and make a lasting impression on potential students.",
      icon: GraduationCap,
      gradient: "from-pink-500 to-rose-500",
      bg: "bg-pink-50",
      iconColor: "text-pink-600"
    },
    {
      step: "03",
      title: "Connect With Students",
      desc: "Students can book a tutoring session directly through the schedule on your profile page. Once you confirm the booking and the session is completed, payment is automatically processed through the JTutors system.",
      icon: Calendar,
      gradient: "from-indigo-500 to-purple-500",
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600"
    },
    {
      step: "04",
      title: "Teach Online, In Person, and Beyond",
      list: [
        "Live online sessions with Zoom integration, fully embedded in JTutors.",
        "Recorded sessions that students can access anytime for review.",
        "In-person lessons for learners in your local area.",
        "Google Classroom integration for sharing assignments, resources, and announcements with your students in one place."
      ],
      icon: Video,
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600"
    },
    {
      step: "05",
      title: "Get Paid Reliably",
      desc: "Tutors are paid quickly and securely after each session. Our automated payment system protects you and ensures everything runs smoothly.",
      icon: DollarSign,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      iconColor: "text-amber-600"
    }
  ];

  const benefits = [
    "Access to motivated students.",
    "Flexibility to teach online, in person, or both.",
    "Zoom + recorded video integration for flexible teaching.",
    "Google Classroom tools for seamless communication.",
    "Reliable, transparent payment system.",
    "Professional dashboard to manage your profile, schedule, and earnings."
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-violet-50 overflow-hidden">
      <Navbar />

      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 120, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 24, repeat: Infinity }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.1, 1.4, 1.1],
            rotate: [0, -90, 0],
            opacity: [0.25, 0.45, 0.25]
          }}
          transition={{ duration: 30, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-violet-400 to-indigo-400 rounded-full blur-3xl"
        />
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 text-white text-sm font-bold uppercase tracking-wide shadow-lg mb-6"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            For Tutors
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 leading-tight"
          >
            Teach, Inspire, Earn — Your Way
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-5 text-lg text-slate-700 max-w-3xl mx-auto font-medium"
          >
            JTutors empowers expert educators to reach students, set their own schedules, and get paid fairly — all in a trusted Jewish learning community.
          </motion.p>
        </motion.div>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 mb-20">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                custom={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={cardVariants}
                whileHover={{ y: -12, scale: 1.03 }}
                className="group relative"
              >
                {/* Gradient Blur Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-3xl blur-xl opacity-25 group-hover:opacity-45 transition-opacity duration-300`} />

                {/* Card */}
                <div className={`relative ${item.bg} backdrop-blur-sm rounded-3xl p-7 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white/50 h-full`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        whileHover="hover"
                        variants={iconRotate}
                        className={`w-14 h-14 ${item.iconColor} flex items-center justify-center rounded-2xl bg-white shadow-lg group-hover:shadow-xl transition-shadow`}
                      >
                        <Icon className="w-7 h-7" />
                      </motion.div>
                      <div className="w-10 h-10 bg-gradient-to-br from-white/80 to-white/40 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 backdrop-blur-sm shadow-md">
                        {item.step}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                    {item.title}
                  </h3>

                  {item.desc && (
                    <p className="text-sm text-gray-700 leading-relaxed font-medium mb-4">
                      {item.desc}
                    </p>
                  )}

                  {item.list && (
                    <ul className="space-y-2">
                      {item.list.map((li, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 md:p-12 mb-16 shadow-2xl border border-white/50"
        >
          <h2 className="text-2xl md:text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-8 flex items-center justify-center gap-3">
            <Star className="w-7 h-7 text-yellow-500" />
            Why Tutors Love JTutors
            <Star className="w-7 h-7 text-yellow-500" />
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {benefits.map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ scale: 1.03, x: 5 }}
                className="flex items-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-purple-100"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full mr-3 flex-shrink-0 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm md:text-base font-semibold text-gray-800">{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-5 justify-center items-center"
        >
          <NavLink
            to="/register?role=tutor"
            className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg px-9 py-4 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
          >
            <span className="relative z-10 flex items-center">
              Start Teaching Today
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </NavLink>

          <NavLink
            to="/register?role=student"
            className="group bg-white text-purple-700 border-4 border-purple-500 font-bold text-lg px-9 py-4 rounded-full hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <span className="flex items-center">
              Find a Tutor
              <Sparkles className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
            </span>
          </NavLink>
        </motion.div>
      </section>
    </div>
  );
};

export default HowItWorksTutors;