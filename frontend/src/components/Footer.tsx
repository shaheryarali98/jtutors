import { 
   
  Shield, 
  Users,
  ArrowRight,
  BookOpen,
 
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin
} from 'lucide-react'

const Footer = () => {
  return (
     <footer className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 mb-4">
                JTutors
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Connecting students with trusted tutors in the Jewish community. Quality education, flexible learning, and personalized support for every student.
              </p>
              
              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <a href="mailto:info@jtutors.com" className="flex items-center text-slate-300 hover:text-cyan-400 transition-colors text-sm group">
                  <Mail className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  info@jtutors.com
                </a>
                <a href="tel:+1234567890" className="flex items-center text-slate-300 hover:text-cyan-400 transition-colors text-sm group">
                  <Phone className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  +1 (234) 567-890
                </a>
                <div className="flex items-start text-slate-300 text-sm">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>123 Education Street,<br />New York, NY 10001</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex space-x-3">
                {[
                  { icon: Facebook, href: "#" },
                  { icon: Twitter, href: "#" },
                  { icon: Instagram, href: "#" },
                  { icon: Linkedin, href: "#" }
                ].map((social, i) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={i}
                      href={social.href}
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gradient-to-br hover:from-violet-600 hover:to-purple-600 transition-all duration-300 flex items-center justify-center hover:scale-110 shadow-lg hover:shadow-purple-500/50"
                    >
                      <Icon className="w-5 h-5 text-slate-300" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Popular Subjects */}
            <div>
              <h4 className="text-base font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400 flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-violet-400" />
                Popular Subjects
              </h4>
              <ul className="space-y-2 text-sm">
                {[
                  "Mathematics",
                  "Hebrew Studies",
                  "Science",
                  "English",
                  "Languages",
                  "Test Prep"
                ].map((item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="text-slate-300 hover:text-violet-400 transition-colors duration-200 flex items-center group"
                    >
                      <ArrowRight className="w-3 h-3 mr-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-base font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center">
                <Users className="w-4 h-4 mr-2 text-blue-400" />
                Company
              </h4>
              <ul className="space-y-2 text-sm">
                {[
                  "About Us",
                  "For Students",
                  "For Tutors",
                  "Blog",
                  "Careers",
                  "Press"
                ].map((item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="text-slate-300 hover:text-blue-400 transition-colors duration-200 flex items-center group"
                    >
                      <ArrowRight className="w-3 h-3 mr-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-base font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-purple-400" />
                Support
              </h4>
              <ul className="space-y-2 text-sm">
                {[
                  "Help Center",
                  "Contact Us",
                  "Safety",
                  "Privacy",
                  "Terms",
                  "FAQs"
                ].map((item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="text-slate-300 hover:text-purple-400 transition-colors duration-200 flex items-center group"
                    >
                      <ArrowRight className="w-3 h-3 mr-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="border-t border-slate-700 py-5">
            <div className="max-w-2xl mx-auto text-center">
              <h4 className="text-xl font-bold text-white mb-3">Stay Updated</h4>
              <p className="text-slate-300 text-sm mb-6">Subscribe to our newsletter for the latest updates and educational tips</p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                />
                <button className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-full hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105 text-sm">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-700 py-5">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-400 text-sm">
                © {new Date().getFullYear()} JTutors. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-slate-400 hover:text-violet-400 transition-colors">
                  Privacy Policy
                </a>
                <span className="text-slate-600">|</span>
                <a href="#" className="text-slate-400 hover:text-violet-400 transition-colors">
                  Terms of Service
                </a>
                <span className="text-slate-600">|</span>
                <a href="#" className="text-slate-400 hover:text-violet-400 transition-colors">
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-violet-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        </div>
      </footer>
  )
}

export default Footer