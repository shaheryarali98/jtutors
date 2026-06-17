import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

const StudentTermsAndConditions = () => {
  const [agreed, setAgreed] = useState(false)
  const [platformAgreement, setPlatformAgreement] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAccept = async () => {
    if (!agreed || !platformAgreement) return

    try {
      setLoading(true)
      await api.post('/student/accept-terms')
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

        <div>
          <h4 className="text-lg font-semibold mb-2">4. User Conduct and Platform Usage</h4>
          <p className="text-gray-700 mb-2">
            Users must use JTutors in a lawful, honest, and appropriate manner consistent with the purpose of the platform. JTutors reserves the right, in its sole discretion, to suspend or terminate any account, with or without notice, for conduct that it deems inappropriate, fraudulent, abusive, or contrary to the interests of JTutors, its tutors, students, or users.
          </p>
          <p className="text-gray-700 mb-2">Without limitation, users may not:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Create an account for any fraudulent, deceptive, or unauthorized purpose.</li>
            <li>Misuse JTutors or any information obtained through the platform for personal commercial gain outside the intended use of the platform.</li>
            <li>Advertise, promote, or offer goods or services unrelated to tutoring services available through JTutors.</li>
            <li>Impersonate another person or entity, or permit another person to use their account, credentials, or identity.</li>
            <li>Circumvent, interfere with, or attempt to bypass JTutors' payment, scheduling, communication, or other platform systems.</li>
          </ul>
          <p className="text-gray-700 mt-2">
            By using JTutors, students and parents expressly agree that any tutor discovered, contacted, or engaged through JTutors will be booked, scheduled, and paid for exclusively through the JTutors platform. Users shall not arrange, solicit, request, or participate in tutoring sessions with JTutors tutors outside of the platform, whether directly or indirectly, for the purpose of avoiding JTutors' fees, policies, or services. Any attempt to move tutoring relationships off-platform may result in immediate suspension or termination of the user's account and may subject the user to additional remedies available under these Terms.
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
        <div className="flex items-start mb-6">
          <input
            type="checkbox"
            id="agreeStudentPlatformExclusivity"
            className="mt-1 mr-3"
            checked={platformAgreement}
            onChange={(e) => setPlatformAgreement(e.target.checked)}
          />
          <label htmlFor="agreeStudentPlatformExclusivity" className="text-sm text-gray-700">
            I agree that any tutor discovered, contacted or engaged through JTutors will be booked, scheduled and paid exclusively through the JTutors platform. *
          </label>
        </div>
        <button
          onClick={handleAccept}
          disabled={!agreed || !platformAgreement || loading}
          className="btn btn-primary w-full md:w-auto"
        >
          {loading ? 'Processing...' : 'Accept and Continue to Dashboard'}
        </button>
      </div>
    </div>
  )
}

export default StudentTermsAndConditions
