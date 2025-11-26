import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const StudentTermsAndConditions = () => {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAccept = async () => {
    if (!agreed) return
    
    try {
      setLoading(true)
      // TODO: Save agreement status to backend when endpoint is ready
      // await api.post('/student/accept-terms')
      navigate('/student/dashboard')
    } catch (error) {
      console.error('Error accepting terms:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="section-title mb-6">Terms and Conditions</h2>
      
      <div className="space-y-6 mb-8">
        <div>
          <h3 className="text-xl font-bold mb-4">Terms and Conditions for Students and Parents</h3>
          <p className="text-gray-700 mb-4">
            By creating a student account on Jtutors.com, you (the "User," including both students and parents/guardians) agree to the following terms and conditions.
          </p>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-2">1. Limitation of Liability and Indemnification</h4>
          <p className="text-gray-700 mb-2">
            Jtutors.com is a platform that provides a marketplace for Users to connect with independent tutors. We do not employ tutors, nor are we responsible for their actions or omissions.
          </p>
          <p className="text-gray-700 mb-2">
            You acknowledge and agree that Jtutors.com, its employees, agents, and affiliates shall not be liable for any claims, disputes, or damages that may arise between you and a tutor. This includes, but is not limited to, any claims of breach of contract, personal injury, property damage, or any other losses resulting from a tutoring session or a tutor's conduct.
          </p>
          <p className="text-gray-700">
            You agree to indemnify and hold harmless Jtutors.com from any and all claims, demands, liabilities, costs, and expenses (including reasonable legal fees) that may arise from your use of the platform, your interactions with tutors, or any breach of these terms.
          </p>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-2">2. Tutor Status and Vetting</h4>
          <p className="text-gray-700 mb-2">
            Jtutors.com is committed to providing a safe environment for our Users. To this end, all tutors on our platform are required to undergo a third-party background check.
          </p>
          <p className="text-gray-700 mb-2">
            The background check is for informational purposes only and is not a guarantee of a tutor's character or fitness to tutor. It is the User's sole responsibility to interview, select, and vet a tutor to ensure they are a good fit for their needs.
          </p>
          <p className="text-gray-700">
            You understand and agree that all tutors on Jtutors.com are independent contractors, not employees or agents of Jtutors.com. Tutors are solely responsible for their own conduct, scheduling, and the content of their lessons.
          </p>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-2">3. Reporting Inappropriate Behavior</h4>
          <p className="text-gray-700 mb-2">
            Your safety is our top priority. We rely on our community to help us maintain a safe and respectful environment.
          </p>
          <p className="text-gray-700 mb-2">
            You must immediately report any behavior by a tutor that you find to be inappropriate, harassing, dangerous, or illegal. This includes, but is not limited to, verbal or physical harassment, solicitations for contact outside of the platform, or any other conduct that violates our community standards.
          </p>
          <p className="text-gray-700">
            Reports can be made through our designated reporting feature or by contacting our support team. Promptly reporting such incidents allows us to take appropriate action, which may include removing the tutor from the platform and cooperating with law enforcement when necessary.
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-start mb-6">
          <input
            type="checkbox"
            id="agreeStudentTerms"
            className="mt-1 mr-3"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <label htmlFor="agreeStudentTerms" className="text-sm text-gray-700">
            I have read and agree to all the terms and conditions stated above. *
          </label>
        </div>
        <button
          onClick={handleAccept}
          disabled={!agreed || loading}
          className="btn btn-primary w-full md:w-auto"
        >
          {loading ? 'Processing...' : 'Accept and Continue to Dashboard'}
        </button>
      </div>
    </div>
  )
}

export default StudentTermsAndConditions

