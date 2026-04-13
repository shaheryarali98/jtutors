import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import api from "../../lib/api"

// 1. Define the props interface
interface PayoutMethodProps {
  onSaveSuccess: () => void; // Function to call on successful connection/onboarding
}

// 2. Update the component signature to accept the prop
const PayoutMethod = ({ onSaveSuccess }: PayoutMethodProps) => {
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    onboarded: false,
    chargesEnabled: false,
    payoutsEnabled: false
  })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [pollingMessage, setPollingMessage] = useState("")
  const [searchParams] = useSearchParams()
  const isStripeReturn = searchParams.get("stripe_return") === "true"
  const isStripeRefresh = searchParams.get("stripe_refresh") === "true"
  const onSaveSuccessCalled = useRef(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isStripeReturn) {
      // User just came back from Stripe — poll until onboarded or timeout
      setPollingMessage("Verifying your Stripe account...")
      pollStripeStatus()
    } else if (isStripeRefresh) {
      // The Stripe link expired; restart onboarding automatically
      handleConnect()
    } else {
      fetchStripeStatus()
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const fetchStripeStatus = async () => {
    try {
      const response = await api.get("/tutor/stripe/status")
      setStripeStatus(response.data)
      if (response.data.onboarded) {
        window.dispatchEvent(new Event("tutor-profile-updated"))
      }
    } catch (error) {
      console.error("Error fetching Stripe status:", error)
      setErrorMessage("Unable to fetch payout status right now.")
    } finally {
      setLoading(false)
    }
  }

  const pollStripeStatus = () => {
    const MAX_POLLS = 8
    let attempts = 0

    const doCheck = async () => {
      attempts++
      try {
        const response = await api.get("/tutor/stripe/status")
        const data = response.data
        setStripeStatus(data)

        if (data.onboarded) {
          // Account is fully ready
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setPollingMessage("")
          setLoading(false)
          window.dispatchEvent(new Event("tutor-profile-updated"))
          if (!onSaveSuccessCalled.current) {
            onSaveSuccessCalled.current = true
            onSaveSuccess()
          }
          return
        }

        if (attempts >= MAX_POLLS) {
          // Stop polling — show whatever status we have
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setPollingMessage("")
          setLoading(false)
          if (data.connected) {
            // Connected but onboarding not fully complete — let user know
            setErrorMessage("Your Stripe account is connected but the setup may not be fully complete yet. Please wait a moment and refresh, or contact support if this persists.")
          }
          return
        }

        setPollingMessage(`Verifying your Stripe account${".".repeat((attempts % 3) + 1)}`)
      } catch (error) {
        console.error("Error polling Stripe status:", error)
        if (attempts >= MAX_POLLS) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setPollingMessage("")
          setLoading(false)
          setErrorMessage("Unable to verify Stripe connection. Please refresh the page.")
        }
      }
    }

    // Start immediately, then every 2.5 seconds
    doCheck()
    pollIntervalRef.current = setInterval(doCheck, 2500)
  }

  const handleConnect = async () => {
    try {
      setLoading(true)
      setErrorMessage("")
      const response = await api.post("/tutor/stripe/connect")
      // Redirect to Stripe onboarding
      window.location.href = response.data.url
    } catch (error: any) {
      console.error("Error connecting Stripe:", error)
      
      // Check if it''s a Connect not enabled error
      if (error.response?.data?.code === "CONNECT_NOT_ENABLED" || 
          error.response?.data?.error?.includes("signed up for Connect")) {
        setErrorMessage(
          "Stripe Connect is not enabled in your Stripe account. " +
          "Please enable it in your Stripe Dashboard: " +
          "https://dashboard.stripe.com/test/settings/connect"
        )
      } else {
        setErrorMessage(
          error.response?.data?.error || 
          "Error connecting to Stripe. Please try again."
        )
      }
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h2 className="section-title">Payout Method</h2>
        <p className="text-gray-600">{pollingMessage || "Loading..."}</p>
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
          <p className="font-semibold mb-2">?? {errorMessage}</p>
          {errorMessage.includes("Stripe Connect is not enabled") && (
            <div className="mt-3 space-y-2">
              <p className="text-sm">To fix this:</p>
              <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
                <li>Go to <a href="https://dashboard.stripe.com/test/settings/connect" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Stripe Dashboard ? Connect Settings</a></li>
                <li>Click "Get started" or "Enable Connect"</li>
                <li>Choose "Marketplace" or "Platform"</li>
                <li>Select "Express accounts"</li>
                <li>Come back and try again</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {!stripeStatus.connected ? (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start mb-4">
            <div className="text-4xl mr-4">??</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Connect Your Stripe Account
              </h3>
              <p className="text-gray-700 mb-4">
                Stripe is a secure payment platform that will handle all your tutoring payments. 
                You''ll need to provide some information to set up your account.
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
            {loading ? "Connecting..." : "Connect with Stripe"}
          </button>
        </div>
      ) : (
        <div>
          {stripeStatus.onboarded ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="text-4xl mr-4">?</div>
                <div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    Stripe Account Connected
                  </h3>
                  <p className="text-green-800 mb-4">
                    Your Stripe account is fully set up and ready to receive payments!
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <span className={`mr-2 ${stripeStatus.chargesEnabled ? "text-green-600" : "text-gray-400"}`}>
                        {stripeStatus.chargesEnabled ? "?" : "?"}
                      </span>
                      <span className="text-gray-700">
                        Charges {stripeStatus.chargesEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className={`mr-2 ${stripeStatus.payoutsEnabled ? "text-green-600" : "text-gray-400"}`}>
                        {stripeStatus.payoutsEnabled ? "?" : "?"}
                      </span>
                      <span className="text-gray-700">
                        Payouts {stripeStatus.payoutsEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="text-4xl mr-4">??</div>
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
              If you''re having issues with your Stripe account or payments, 
              please contact our support team or visit the Stripe dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayoutMethod
