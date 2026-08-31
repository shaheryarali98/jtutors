import { forwardRef, useImperativeHandle, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = (() => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
  return key ? loadStripe(key) : null
})()

export interface SavedCard {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface CardCaptureHandle {
  /** Returns the Stripe payment method id to attach to the booking. */
  resolvePaymentMethod: () => Promise<string>
}

interface Props {
  savedCards: SavedCard[]
  clientSecret: string | null
  selectedCardId: string
  onSelectCard: (id: string) => void
  disabled?: boolean
}

const NEW_CARD = 'new'

const Inner = forwardRef<CardCaptureHandle, Props>(
  ({ savedCards, selectedCardId, onSelectCard, disabled }, ref) => {
    const stripe = useStripe()
    const elements = useElements()
    const [ready, setReady] = useState(false)
    const [loadError, setLoadError] = useState('')

    const usingNewCard = selectedCardId === NEW_CARD || savedCards.length === 0

    useImperativeHandle(ref, () => ({
      async resolvePaymentMethod() {
        if (!usingNewCard) return selectedCardId

        if (!stripe || !elements) {
          throw new Error('The card form is still loading. Please try again in a moment.')
        }
        if (!ready) {
          throw new Error('The card form has not finished loading yet. Please wait a moment.')
        }

        const { error: submitError } = await elements.submit()
        if (submitError) {
          throw new Error(submitError.message || 'Please check your card details.')
        }

        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: { return_url: `${window.location.origin}/student/bookings` },
          redirect: 'if_required',
        })

        if (error) {
          throw new Error(error.message || 'We could not save that card.')
        }

        const paymentMethod = setupIntent?.payment_method
        const paymentMethodId =
          typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.id

        if (!paymentMethodId) {
          throw new Error('We could not read the saved card. Please try again.')
        }

        return paymentMethodId
      },
    }))

    return (
      <div className="space-y-3">
        {savedCards.length > 0 && (
          <div className="space-y-2">
            {savedCards.map((card) => (
              <label
                key={card.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                  selectedCardId === card.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="booking-card"
                  checked={selectedCardId === card.id}
                  onChange={() => onSelectCard(card.id)}
                  disabled={disabled}
                />
                <span className="text-sm text-slate-800">
                  <span className="font-semibold capitalize">{card.brand}</span> ••••{' '}
                  {card.last4}
                  <span className="text-slate-500">
                    {' '}
                    — expires {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                  </span>
                </span>
              </label>
            ))}

            <label
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                selectedCardId === NEW_CARD
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="booking-card"
                checked={selectedCardId === NEW_CARD}
                onChange={() => onSelectCard(NEW_CARD)}
                disabled={disabled}
              />
              <span className="text-sm text-slate-800">Use a different card</span>
            </label>
          </div>
        )}

        {usingNewCard && (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {!ready && !loadError && (
              <p className="text-sm text-slate-500">Loading secure card form…</p>
            )}
            {loadError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <p className="font-semibold">The secure card form could not load.</p>
                <p className="mt-1">{loadError}</p>
              </div>
            )}
            <PaymentElement
              onReady={() => setReady(true)}
              onLoadError={(event: any) => {
                console.error('Booking PaymentElement failed to load:', event)
                setLoadError(
                  event?.error?.message ||
                    'Please refresh and try again. If it keeps happening, contact support.'
                )
              }}
            />
          </div>
        )}
      </div>
    )
  }
)
Inner.displayName = 'BookingCardCaptureInner'

/**
 * Collects the card used for a booking.
 *
 * The card is only stored here — the student is not charged until the tutor
 * accepts the session, at which point the backend charges this card
 * off-session.
 */
const BookingCardCapture = forwardRef<CardCaptureHandle, Props>((props, ref) => {
  if (!stripePromise) {
    return (
      <p className="text-sm text-red-600">
        Card payments are unavailable right now. Please contact support.
      </p>
    )
  }

  if (!props.clientSecret) {
    return <p className="text-sm text-slate-500">Preparing secure card form…</p>
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret: props.clientSecret, appearance: { theme: 'stripe' } }}
    >
      <Inner {...props} ref={ref} />
    </Elements>
  )
})
BookingCardCapture.displayName = 'BookingCardCapture'

export default BookingCardCapture
