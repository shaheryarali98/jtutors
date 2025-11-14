import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import { useMemo, useState } from 'react'
import api from '../../lib/api'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

interface PaymentModalProps {
  clientSecret: string | null
  paymentId: string | null
  amount: number
  currency: string
  onSuccess: () => void
  onCancel: () => void
  disabled?: boolean
}

const PaymentForm = ({
  paymentId,
  amount,
  currency,
  onSuccess,
  onCancel,
}: {
  paymentId: string
  amount: number
  currency: string
  onSuccess: () => void
  onCancel: () => void
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!stripe || !elements) {
      setError('Stripe is not available. Please check your configuration.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      })

      if (stripeError) {
        throw new Error(stripeError.message || 'Unable to confirm payment.')
      }

      if (paymentIntent?.status === 'succeeded') {
        await api.post(`/payments/${paymentId}/confirm`, { paymentId })
        onSuccess()
      } else {
        setError('Payment is still pending. Please wait or try again shortly.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Payment failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
        <p className="text-sm text-slate-500">Amount due</p>
        <p className="text-xl font-semibold text-slate-900">
          {currency.toUpperCase()} {amount.toFixed(2)}
        </p>
      </div>

      <PaymentElement />

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Processing…' : 'Pay with Stripe'}
        </button>
      </div>
    </form>
  )
}

const PaymentModal = ({ clientSecret, paymentId, amount, currency, onSuccess, onCancel }: PaymentModalProps) => {
  const options: StripeElementsOptions | undefined = useMemo(() => {
    if (!clientSecret) return undefined
    return {
      clientSecret,
      appearance: {
        theme: 'stripe',
      },
    }
  }, [clientSecret])

  if (!clientSecret || !paymentId) {
    return null
  }

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Stripe is not configured</h2>
          <p className="text-sm text-slate-600">
            Add <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to your environment to enable payments.
          </p>
          <button type="button" className="btn btn-primary" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Complete your payment</h2>
        <p className="text-sm text-slate-500 mb-4">Secure checkout powered by Stripe.</p>
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm paymentId={paymentId} amount={amount} currency={currency} onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      </div>
    </div>
  )
}

export default PaymentModal


