import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

const Footer = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // TODO: Implement form submission to backend
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setSubmitted(false), 3000)
    }, 1000)
  }

  return (
    <footer className="relative overflow-hidden py-16 mt-16">
      <div className="absolute inset-0 opacity-95" style={{ background: 'linear-gradient(to bottom right, #012c54, #014a7a, #016ba3)' }} />
      <div className="relative max-w-4xl mx-auto rounded-3xl bg-white/10 p-10 text-white shadow-2xl backdrop-blur">
        <h2 className="text-3xl font-black">Didn't find your question here?</h2>
        <p className="mt-2 text-base text-white/80">
          Send us your question and our team will respond within 24 hours.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input
            className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder:text-white/60 focus:border-white focus:outline-none"
            placeholder="Full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="email"
            className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder:text-white/60 focus:border-white focus:outline-none"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder:text-white/60 focus:border-white focus:outline-none md:col-span-2"
            placeholder="Question subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />
          <textarea
            className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder:text-white/60 focus:border-white focus:outline-none md:col-span-2"
            rows={4}
            placeholder="Describe how we can help"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
          />
          <label className="flex items-center gap-2 text-xs text-white/80 md:col-span-2">
            <input type="checkbox" className="rounded border-white/40 bg-white/10" required />
            I have read and agree to all Terms & Conditions.
          </label>
          {submitted && (
            <div className="md:col-span-2 bg-green-500/20 border border-green-300 text-white px-4 py-2 rounded-lg">
              Thank you! Your message has been sent.
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold shadow-lg hover:bg-slate-100 md:col-span-2 disabled:opacity-50"
            style={{ color: '#f5a11a' }}
          >
            {submitting ? 'Submitting...' : 'Submit your question'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </footer>
  )
}

export default Footer

