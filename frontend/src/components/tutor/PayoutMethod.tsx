import { useEffect, useState } from 'react'
import api from '../../lib/api'

const PayoutMethod = () => {
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    onboarded: false,
    chargesEnabled: false,
    payoutsEnabled: false
  })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchStripeStatus()
  }, [])

  const fetchStripeStatus = async () => {
    try {
      const response = await api.get('/tutor/stripe/status')
      setStripeStatus(response.data)
      if (response.data.onboarded) {
        window.dispatchEvent(new Event('tutor-profile-updated'))
      }
    } catch (error) {
      console.error('Error fetching Stripe status:', error)
      setErrorMessage('Unable to fetch payout status right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setLoading(true)
      setErrorMessage('')
      const response = await api.post('/tutor/stripe/connect')
      // Redirect to Stripe onboarding
      window.location.href = response.data.url
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      setErrorMessage('Error connecting to Stripe. Please try again.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h2 className="section-title">Payout Method</h2>
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="section-title">Payout Method</h2>
      <p className="text-gray-600 mb-6">
        Connect your Stripe account to receive payments from students
      </p>

      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">
          {errorMessage}
        </div>
      )}

      {!stripeStatus.connected ? (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start mb-4">
            <div className="text-4xl mr-4">💳</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Connect Your Stripe Account
              </h3>
              <p className="text-gray-700 mb-4">
                Stripe is a secure payment platform that will handle all your tutoring payments. 
                You'll need to provide some information to set up your account.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                <li>Secure and trusted payment processing</li>
                <li>Direct deposits to your bank account</li>
                <li>Track all your earnings in one place</li>
                <li>Fast and reliable payouts</li>
              </ul>
            </div>
          </div>
          
          <button
            onClick={handleConnect}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Connecting...' : 'Connect with Stripe'}
          </button>
        </div>
      ) : (
        <div>
          {stripeStatus.onboarded ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="text-4xl mr-4">✓</div>
                <div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    Stripe Account Connected
                  </h3>
                  <p className="text-green-800 mb-4">
                    Your Stripe account is fully set up and ready to receive payments!
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <span className={`mr-2 ${stripeStatus.chargesEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {stripeStatus.chargesEnabled ? '✓' : '○'}
                      </span>
                      <span className="text-gray-700">
                        Charges {stripeStatus.chargesEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className={`mr-2 ${stripeStatus.payoutsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {stripeStatus.payoutsEnabled ? '✓' : '○'}
                      </span>
                      <span className="text-gray-700">
                        Payouts {stripeStatus.payoutsEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="text-4xl mr-4">⚠️</div>
                <div>
                  <h3 className="text-xl font-bold text-yellow-900 mb-2">
                    Complete Your Stripe Setup
                  </h3>
                  <p className="text-yellow-800 mb-4">
                    Your Stripe account is connected but not fully set up. 
                    Please complete the onboarding process to start receiving payments.
                  </p>
                  
                  <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    Complete Stripe Setup
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Need Help?</h4>
            <p className="text-sm text-gray-600">
              If you're having issues with your Stripe account or payments, 
              please contact our support team or visit the Stripe dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayoutMethod


