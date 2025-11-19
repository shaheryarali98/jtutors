import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../lib/api'
import { resolveImageUrl } from '../../lib/media'

interface Invoice {
  id: string
  amount: number
  currency: string
  paymentStatus: string
  paidAt?: string | null
  createdAt: string
  booking: {
    id: string
    startTime: string
    endTime: string
    tutor: {
      firstName: string
      lastName: string
      profileImage?: string
    }
  }
}

const currencyFormatter = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount)

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const StudentInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await api.get('/payments/my')
      setInvoices(response.data.payments)
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError('Unable to load invoices right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Invoices &amp; Bills</h1>
          <p className="text-slate-600 mt-2">
            Keep track of every payment made to tutors. Download records for your personal bookkeeping.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-3xl shadow p-10 text-center text-slate-500">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-12 text-center">
            <div className="text-6xl mb-3">💳</div>
            <h3 className="text-xl font-semibold text-slate-900">No invoices yet</h3>
            <p className="text-slate-500 mt-2">
              After you complete payments for your bookings, receipts will be available here for download.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Tutor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => {
                  const tutor = invoice.booking.tutor
                  const avatar = resolveImageUrl(tutor.profileImage)
                  const status = invoice.paymentStatus.toUpperCase()
                  const statusClass =
                    status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-700'
                      : status === 'PENDING'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'

                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{invoice.id.slice(0, 10)}…</span>
                          <span className="text-xs text-slate-500">
                            Created {dateFormatter.format(new Date(invoice.createdAt))}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-xs font-semibold text-primary-600">
                            {avatar ? (
                              <img src={avatar} alt={`${tutor.firstName}`} className="h-full w-full object-cover" />
                            ) : (
                              `${tutor.firstName.charAt(0)}${tutor.lastName.charAt(0)}`
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {tutor.firstName} {tutor.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{invoice.booking.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="flex flex-col">
                          <span>{dateFormatter.format(new Date(invoice.booking.startTime))}</span>
                          <span className="text-xs text-slate-500">
                            Ends {dateFormatter.format(new Date(invoice.booking.endTime))}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {currencyFormatter(invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                          {status}
                        </span>
                        {invoice.paidAt && (
                          <p className="text-xs text-slate-500 mt-1">
                            Paid {dateFormatter.format(new Date(invoice.paidAt))}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <button
                          type="button"
                          className="btn btn-outline text-sm"
                          onClick={() => window.print()}
                        >
                          Download receipt
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default StudentInvoices


