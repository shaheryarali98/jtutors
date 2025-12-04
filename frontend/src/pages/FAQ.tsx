import { useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { faqs } from '../constants/faqs'

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#012c4f' }}>
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-white/80">
            Find answers to common questions about JTutors
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/80 mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:info@jtutors.com"
            className="inline-block px-6 py-3 rounded-full bg-white font-semibold shadow-lg hover:bg-slate-100 transition-colors"
            style={{ color: '#f5a11a' }}
          >
            Contact Us
          </a>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default FAQ

