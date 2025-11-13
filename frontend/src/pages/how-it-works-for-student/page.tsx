// HowItWorksStudents.jsx
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Star, Check, Sparkles, GraduationCap, Calendar, Video, FileText, Lock } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { NavLink } from 'react-router-dom';

// Animation Variants
const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1]
    }
  })
};

const floatingAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

const iconRotate = {
  hover: { rotate: 360, transition: { duration: 0.6 } }
};

const HowItWorksStudents = () => {
  const steps = [
    {
      step: "01",
      title: "Create Your Free Account",
      desc: "Sign up in minutes. Tell us about your goals—whether it’s preparing for an exam, catching up in class, or exploring something new.",
      icon: GraduationCap,
      gradient: "from-violet-500 to-purple-500",
      bg: "bg-violet-50",
      iconColor: "text-violet-600"
    },
    {
      step: "02",
      title: "Match With the Right Tutor",
      desc: "Browse our network of expert tutors or let us recommend matches based on your subject, level, and learning style. All tutors are vetted for experience, professionalism, and commitment to student success.",
      icon: Calendar,
      gradient: "from-blue-500 to-cyan-500",
      bg: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      step: "03",
      title: "Schedule & Learn—Online or In Person",
      list: [
        "Online sessions hosted through Zoom integration directly in the platform—no extra setup required.",
        "Recorded lessons you can replay anytime to reinforce what you’ve learned.",
        "In-person sessions with tutors in your local area. Simply filter by location and availability to find tutors offering face-to-face learning."
      ],
      icon: Video,
      gradient: "from-green-500 to-emerald-500",
      bg: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      step: "04",
      title: "Track Your Progress & Stay Connected",
      list: [
        "After each session, you’ll get notes, feedback, and resources to keep moving forward.",
        "Use Google Classroom integration to access assignments, shared files, and updates from your tutor.",
        "Parents and teachers can stay informed through Classroom updates, ensuring communication stays seamless."
      ],
      icon: FileText,
      gradient: "from-orange-500 to-red-500",
      bg: "bg-orange-50",
      iconColor: "text-orange-600"
    },
    {
      step: "05",
      title: "Pay Safely & Fairly",
      desc: "You only pay for the sessions you book, through our secure system. No hidden fees, no surprises.",
      icon: Lock,
      gradient: "from-teal-500 to-cyan-500",
      bg: "bg-teal-50",
      iconColor: "text-teal-600"
    }
  ];

  const benefits = [
    "Learn from trusted, knowledgeable tutors.",
    "Flexible scheduling—online, in person, or both.",
    "Zoom-powered live sessions plus recorded playback.",
    "Google Classroom integration for smooth communication.",
    "Safe, private, and Jewish learning environment."
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-sky-50 to-cyan-50 overflow-hidden">
      <Navbar />

      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 120, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 22, repeat: Infinity }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.1, 1.4, 1.1],
            rotate: [0, -90, 0],
            opacity: [0.25, 0.45, 0.25]
          }}
          transition={{ duration: 28, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl"
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
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold uppercase tracking-wide shadow-lg mb-6"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            For Students
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 leading-tight"
          >
            How It Works – Simple, Smart, Student-First
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-5 text-lg text-slate-700 max-w-3xl mx-auto font-medium"
          >
            At JTutors, we make finding and learning with the perfect tutor effortless. From signup to success — every step is designed for you.
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

                  <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-violet-600 transition-colors">
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
                          <CheckCircle2 className="w-4 h-4 text-violet-600 mr-2 mt-0.5 flex-shrink-0" />
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
          <h2 className="text-2xl md:text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600 mb-8 flex items-center justify-center gap-3">
            <Star className="w-7 h-7 text-yellow-500" />
            Why Students Love JTutors
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
                className="flex items-center bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-violet-100"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full mr-3 flex-shrink-0 flex items-center justify-center">
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
            to="/register?role=student"
            className="group relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-lg px-9 py-4 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
          >
            <span className="relative z-10 flex items-center">
              Find Your Tutor
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </NavLink>

          <NavLink
            to="/register?role=tutor"
            className="group bg-white text-violet-700 border-4 border-violet-500 font-bold text-lg px-9 py-4 rounded-full hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <span className="flex items-center">
              Teach on JTutors
              <Sparkles className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
            </span>
          </NavLink>
        </motion.div>
      </section>
    </div>
  );
};

export default HowItWorksStudents;