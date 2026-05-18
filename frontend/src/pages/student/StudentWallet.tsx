import { useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'
import { usePlatformSettings } from '../../store/settingsStore'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = (() => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
  return key ? loadStripe(key) : null
})()

interface WalletSummary {
  availableBalance: number
  pendingPayouts: number
  lifetimeEarnings: number
  totalWithdrawn: number
  totalRefunds?: number
  currency: string
}

interface WithdrawalRow {
  id: string
  amount: number
  currency: string
  status: string
  method?: string | null
  charge?: number | null
  netAmount?: number | null
  requestedAt: string
}

interface WithdrawalResponse {
  withdrawals: WithdrawalRow[]
  walletSummary: WalletSummary | null
}

interface SavedCard {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface Invoice {
  id: string
  amount: number
  currency: string
  paymentStatus: string
  paidAt?: string | null
  createdAt: string
  booking?: {
    id: string
    startTime: string
    endTime: string
    tutor?: {
      firstName: string
      lastName: string
      profileImage?: string
    } | null
  } | null
}

const StudentWallet = () => {
  const [data, setData] = useState<WithdrawalResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showAddCard, setShowAddCard] = useState(false)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [cardFeedback, setCardFeedback] = useState('')
  const [removingCardId, setRemovingCardId] = useState<string | null>(null)
  const { settings, fetchSettings } = usePlatformSettings()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    loadWithdrawals()
  }, [])

  useEffect(() => {
    if (settings && !selectedMethod) {
      setSelectedMethod(settings.withdrawMethods[0] || '')
    }
  }, [settings, selectedMethod])

  const loadWithdrawals = async () => {
    try {
      setLoading(true)
      setError('')
      const [walletRes, cardsRes, invoicesRes] = await Promise.all([
        api.get<WithdrawalResponse>('/withdrawals/my'),
        api.get<{ paymentMethods: SavedCard[] }>('/student/payment-methods').catch(() => ({ data: { paymentMethods: [] } })),
        api.get<{ payments: Invoice[] }>('/payments/my').catch(() => ({ data: { payments: [] } })),
      ])
      setData(walletRes.data)
      setSavedCards(cardsRes.data.paymentMethods ?? [])
      setInvoices(Array.isArray(invoicesRes.data.payments) ? invoicesRes.data.payments : [])
    } catch (err) {
      console.error('Error loading wallet data:', err)
      setError('Unable to load wallet history right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount) {
      setFeedback('Enter an amount to withdraw.')
      return
    }
    const numericAmount = Number(withdrawAmount)
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFeedback('Enter a valid withdrawal amount.')
      return
    }
    if (data?.walletSummary && numericAmount > data.walletSummary.availableBalance) {
      setFeedback('Amount exceeds your available balance.')
      return
    }
    if (!selectedMethod) {
      setFeedback('Choose a withdrawal method.')
      return
    }

    try {
      setWithdrawing(true)
      setFeedback('')
      await api.post('/withdrawals', {
        amount: numericAmount,
        method: selectedMethod,
      })
      setWithdrawAmount('')
      setFeedback('Withdrawal request submitted.')
      await loadWithdrawals()
    } catch (err: any) {
      console.error('Withdrawal error:', err)
      setFeedback(err.response?.data?.error || 'Unable to submit withdrawal request.')
    } finally {
      setWithdrawing(false)
      setTimeout(() => setFeedback(''), 4000)
    }
  }

  const handleAddCardClick = async () => {
    try {
      setCardFeedback('')
      const res = await api.post<{ clientSecret: string }>('/student/payment-methods/setup-intent')
      const secret = res.data.clientSecret
      if (!secret) {
        setCardFeedback('Unable to start card setup. Please try again.')
        return
      }
      setSetupClientSecret(secret)
      setShowAddCard(true)
    } catch (err: any) {
      setCardFeedback(err.response?.data?.error || 'Unable to start card setup. Please try again.')
    }
  }

  const handleRemoveCard = async (cardId: string) => {
    if (!window.confirm('Remove this card from your account?')) return
    setRemovingCardId(cardId)
    setCardFeedback('')
    try {
      await api.delete(`/student/payment-methods/${cardId}`)
      setSavedCards((prev) => prev.filter((c) => c.id !== cardId))
      setCardFeedback('Card removed successfully.')
    } catch {
      setCardFeedback('Failed to remove card. Please try again.')
    } finally {
      setRemovingCardId(null)
      setTimeout(() => setCardFeedback(''), 3000)
    }
  }

  const estimatedCharge = useMemo(() => {
    if (!settings) return 0
    const amount = Number(withdrawAmount)
    if (!amount || Number.isNaN(amount)) return 0
    const percent = settings.withdrawPercentageCharge ?? 0
    const fixed = settings.withdrawFixedCharge ?? 0
    const charge = amount * (percent / 100) + fixed
    return Math.min(charge, amount)
  }, [settings, withdrawAmount])

  const estimatedNet = useMemo(() => {
    const amount = Number(withdrawAmount)
    if (!amount || Number.isNaN(amount)) return 0
    return Math.max(0, amount - estimatedCharge)
  }, [withdrawAmount, estimatedCharge])

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Wallet</h1>
          <p className="text-slate-600 mt-2">
            Review payments, invoices, saved cards, refunds, and wallet balances in one place.
          </p>
        </header>

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">Loading wallet…</div>
        ) : error ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-red-600">{error}</div>
        ) : !data || !data.walletSummary ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">
            No refundable balance yet. Completed refunds will appear here.
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-3">
              <StatCard label="Available balance" value={`$${data.walletSummary.availableBalance.toFixed(2)}`} emphasis />
              <StatCard label="Refunds issued" value={`$${(data.walletSummary.totalRefunds ?? 0).toFixed(2)}`} />
              <StatCard label="Pending payout requests" value={`$${data.walletSummary.pendingPayouts.toFixed(2)}`} />
            </section>

            <section className="bg-white rounded-3xl shadow p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Request a payout</h2>
                  <p className="text-sm text-slate-500">
                    Only refunded credits can be withdrawn. Requests are reviewed by the admin team.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="label">Amount (USD)</label>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={withdrawAmount}
                      onChange={(event) => setWithdrawAmount(event.target.value)}
                      placeholder={`Max $${data.walletSummary.availableBalance.toFixed(2)}`}
                    />
                  </div>
                  <div>
                    <label className="label">Preferred payout method</label>
                    <select
                      className="input"
                      value={selectedMethod}
                      onChange={(event) => setSelectedMethod(event.target.value)}
                      disabled={!settings?.withdrawMethods.length}
                    >
                      {settings?.withdrawMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-1">
                    <p>
                      <span className="font-semibold text-slate-800">Estimated fee:</span> $
                      {estimatedCharge.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Estimated payout:</span> $
                      {estimatedNet.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleWithdraw}
                    disabled={withdrawing || !data.walletSummary.availableBalance}
                  >
                    {withdrawing ? 'Submitting…' : 'Submit request'}
                  </button>
                  {feedback && <p className="text-sm text-slate-600">{feedback}</p>}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-800">Need to know</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Only refunded credits from completed bookings are withdrawable.</li>
                    <li>You can track each request in the history table below.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Invoices &amp; bills</h2>
                  <p className="text-sm text-slate-500">Your payment history for tutoring sessions.</p>
                </div>
              </div>

              {invoices.length === 0 ? (
                <p className="text-sm text-slate-500">No payment records yet. Completed session payments will appear here.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3">Tutor</th>
                        <th className="px-4 py-3">Session</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((invoice) => {
                        const tutor = invoice.booking?.tutor ?? null
                        const tutorFirst = tutor?.firstName ?? ''
                        const tutorLast = tutor?.lastName ?? ''
                        const avatar = resolveImageUrl(tutor?.profileImage || '')
                        const status = (invoice.paymentStatus || 'PENDING').toUpperCase()

                        return (
                          <tr key={invoice.id}>
                            <td className="px-4 py-3 text-slate-700">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-xs font-semibold text-primary-600">
                                  {avatar ? (
                                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    `${tutorFirst.charAt(0)}${tutorLast.charAt(0)}` || 'NA'
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {tutorFirst || tutorLast ? `${tutorFirst} ${tutorLast}`.trim() : 'Tutor unavailable'}
                                  </p>
                                  <p className="text-xs text-slate-500">Invoice {invoice.id.slice(0, 10)}…</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {invoice.booking?.startTime ? (
                                <div className="flex flex-col">
                                  <span>{new Date(invoice.booking.startTime).toLocaleString()}</span>
                                  {invoice.booking.endTime && (
                                    <span className="text-xs text-slate-500">
                                      Ends {new Date(invoice.booking.endTime).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No session linked</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {(invoice.currency || 'USD').toUpperCase()} {invoice.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  status === 'PAID'
                                    ? 'bg-green-100 text-green-700'
                                    : status === 'PENDING'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {status}
                              </span>
                              {invoice.paidAt && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Paid {new Date(invoice.paidAt).toLocaleString()}
                                </p>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl shadow p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Withdrawal history</h2>
                  <p className="text-sm text-slate-500">Submitted payout requests and their current status.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Requested</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(withdrawal.requestedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{withdrawal.method || 'Manual'}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">
                          ${withdrawal.amount.toFixed(2)}
                          <span className="text-xs text-slate-500">
                            {' '}
                            (net ${withdrawal.netAmount?.toFixed(2) ?? withdrawal.amount.toFixed(2)})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              withdrawal.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : withdrawal.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {withdrawal.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.withdrawals.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                          No withdrawal requests yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Saved payment methods</h2>
                  <p className="text-sm text-slate-500">Cards saved securely by Stripe for faster checkout.</p>
                </div>
                {stripePromise && (
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    onClick={handleAddCardClick}
                  >
                    + Add card
                  </button>
                )}
              </div>

              {cardFeedback && (
                <p className="text-sm text-slate-600 mb-3">{cardFeedback}</p>
              )}

              {savedCards.length === 0 && !showAddCard && (
                <p className="text-sm text-slate-500">No saved cards yet. Add one for faster checkout.</p>
              )}

              {savedCards.length > 0 && (
                <ul className="space-y-3 mb-4">
                  {savedCards.map((card) => (
                    <li key={card.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 capitalize">
                          {card.brand} &bull;&bull;&bull;&bull; {card.last4}
                        </p>
                        <p className="text-xs text-slate-500">
                          Expires {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={removingCardId === card.id}
                        onClick={() => handleRemoveCard(card.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                      >
                        {removingCardId === card.id ? 'Removing…' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showAddCard && setupClientSecret && stripePromise && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Add a new card</h3>
                  <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret, appearance: { theme: 'stripe' } }}>
                    <AddCardForm
                      onSuccess={() => {
                        setShowAddCard(false)
                        setSetupClientSecret(null)
                        setCardFeedback('Card saved successfully!')
                        loadWithdrawals()
                        setTimeout(() => setCardFeedback(''), 3000)
                      }}
                      onCancel={() => {
                        setShowAddCard(false)
                        setSetupClientSecret(null)
                      }}
                    />
                  </Elements>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

const AddCardForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSaving(true)
    setErr('')
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })
    if (error) {
      setErr(error.message || 'Failed to save card.')
      setSaving(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn btn-secondary text-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary text-sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save card'}
        </button>
      </div>
    </form>
  )
}

interface StatCardProps {
  label: string
  value: string
  emphasis?: boolean
}

const StatCard = ({ label, value, emphasis }: StatCardProps) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
      emphasis ? 'bg-gradient-to-br from-primary-600 to-indigo-600 text-white border-transparent' : ''
    }`}
  >
    <p className={`text-xs uppercase tracking-wide ${emphasis ? 'text-white/70' : 'text-slate-500'}`}>{label}</p>
    <p className={`text-2xl font-bold mt-2 ${emphasis ? 'text-white' : 'text-slate-900'}`}>{value}</p>
  </div>
)

export default StudentWallet


