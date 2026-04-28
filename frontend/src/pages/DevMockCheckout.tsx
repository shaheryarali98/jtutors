import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

/**
 * DEV-ONLY mock checkout page.
 * Simulates Stripe Checkout locally so you can test the full enrollment/booking
 * payment flow without a Stripe account or CLI.
 *
 * URL params:
 *   type        'enrollment' | 'payment'
 *   id          enrollmentId or paymentId
 *   title       human-readable product name
 *   amount      number (USD)
 *   returnUrl   optional override for the redirect after success
 */
const DevMockCheckout = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const type = params.get('type') as 'enrollment' | 'payment' | null
  const id = params.get('id') || ''
  const title = params.get('title') || 'Tutoring Session'
  const amount = parseFloat(params.get('amount') || '0')
  const returnUrl = params.get('returnUrl') || '/student/dashboard'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    if (!type || !id) { setError('Invalid checkout link.'); return }
    setLoading(true); setError('')
    try {
      if (type === 'enrollment') {
        await api.post('/dev/confirm-enrollment', { enrollmentId: id })
        navigate(`/student/enrollment-success?session_id=dev_bypass&enrollmentId=${id}`, { replace: true })
      } else {
        await api.post('/dev/confirm-payment', { paymentId: id })
        navigate(returnUrl, { replace: true })
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Confirmation failed.')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate(type === 'enrollment' ? '/student/courses' : '/student/bookings', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header banner */}
        <div className="bg-[#012c54] px-6 py-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold bg-amber-400 text-[#012c54] px-2 py-0.5 rounded-full uppercase tracking-wide">
              Dev Mode
            </span>
            <span className="text-xs text-blue-200">Stripe bypass active</span>
          </div>
          <h1 className="text-xl font-bold">Test Checkout</h1>
          <p className="text-sm text-blue-200 mt-0.5">This page only appears when DEV_BYPASS_STRIPE=true</p>
        </div>

        <div className="px-6 py-5">
          {/* Order summary */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Order summary</p>
            <p className="font-semibold text-slate-900 text-base">{title}</p>
            <p className="text-2xl font-bold text-[#012c54] mt-1">
              ${amount.toFixed(2)} <span className="text-sm font-normal text-slate-500">USD</span>
            </p>
          </div>

          {/* Fake card fields — visual only */}
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Card number</label>
              <div className="mt-1 px-3 py-2.5 bg-slate-100 rounded-lg text-slate-400 text-sm font-mono cursor-not-allowed">
                4242 4242 4242 4242
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry</label>
                <div className="mt-1 px-3 py-2.5 bg-slate-100 rounded-lg text-slate-400 text-sm font-mono cursor-not-allowed">
                  12/28
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CVC</label>
                <div className="mt-1 px-3 py-2.5 bg-slate-100 rounded-lg text-slate-400 text-sm font-mono cursor-not-allowed">
                  123
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-[#012c54] hover:bg-[#023a70] text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Confirming…' : `Pay $${amount.toFixed(2)} (Test Mode)`}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full mt-2 text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            Cancel
          </button>
        </div>

        <div className="px-6 pb-4 text-center text-xs text-slate-400">
          No real payment is processed. This page is disabled in production.
        </div>
      </div>
    </div>
  )
}

export default DevMockCheckout
