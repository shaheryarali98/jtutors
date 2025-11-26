import { useState } from 'react'
import { X } from 'lucide-react'

interface TutorTermsModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
}

const TutorTermsModal = ({ isOpen, onClose, onAccept }: TutorTermsModalProps) => {
  const [agreed, setAgreed] = useState(false)

  if (!isOpen) return null

  const handleAccept = () => {
    if (agreed) {
      onAccept()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-900">Terms and Conditions for Tutors</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-4">Tutor Usage Agreement – Non-Circumvention & Exclusivity Clause</h3>
              <p className="text-gray-700 mb-4">
                In consideration for your registration as a Tutor on JTutors.com ("the Site"), you ("Tutor") agree to the following terms and conditions regarding use of the platform and engagement with Students (as defined below). This Agreement forms a legally binding contract between you and JTutors, Inc. ("JTutors").
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">1. Definitions</h4>
              <p className="text-gray-700 mb-2">
                "Student" refers to any individual or party seeking tutoring services who is introduced to the Tutor via the Site, regardless of whether tutoring services are ultimately rendered.
              </p>
              <p className="text-gray-700">
                "JTutors Platform" refers to any and all systems (including video, messaging, scheduling, and payment functionalities) hosted by JTutors.com or affiliated technology partners.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">2. Site Exclusivity & Use of Platform</h4>
              <p className="text-gray-700 mb-2">
                JTutors provides a messaging system that enables students to communicate with tutors, if needed. You agree you will only communicate with students regarding all tutoring matters through such messaging system.
              </p>
              <p className="text-gray-700 mb-2">
                As a condition of participation on the JTutors platform, you agree that:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-2">
                <li>All tutoring sessions with any Student whom you initially met, were introduced to, or otherwise connected with via the Site must be scheduled, conducted, and paid for exclusively through the JTutors platform.</li>
                <li>You may not solicit or accept payments for services offered to such Students outside of the JTutors platform, including but not limited to cash, Venmo, PayPal, Zelle, check, or any other third-party method.</li>
                <li>You may not provide contact information, or request or accept contact information, in order to circumvent the JTutors platform. If contact information is offered by the student, you must decline to accept it and not retain it for your records.</li>
              </ul>
              <p className="text-gray-700">
                We reserve the right to enforce our rights and remedies under this Agreement, at law, and in equity against the tutor.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">3. Non-Circumvention</h4>
              <p className="text-gray-700">
                For a period of 24 months following your last tutoring session with any Student introduced through JTutors.com, you agree not to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                <li>Provide tutoring services to such Student outside of the JTutors platform;</li>
                <li>Induce or encourage any Student to terminate or reduce their use of the Site;</li>
                <li>Refer the Student to any competing platform or personal tutoring business for the purpose of engaging outside JTutors.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">4. Liquidated Damages</h4>
              <p className="text-gray-700 mb-2">
                In the event of a breach of this agreement (including circumvention or off-platform solicitation), you agree that:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>JTutors shall be entitled to liquidated damages of $2,500 per Student, representing a reasonable estimate of the damages JTutors would suffer from such a breach.</li>
                <li>JTutors may withhold any outstanding payments owed to you, and your account may be permanently suspended solely at the discretion of JTutors</li>
                <li>You will be responsible for all reasonable attorneys' fees and collection costs incurred in enforcing this provision.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">5. Monitoring & Enforcement</h4>
              <p className="text-gray-700">
                JTutors reserves the right to investigate any suspected violation of this Agreement and may monitor messages, session history, and payment records for compliance. You agree to cooperate with any such investigation and provide payment records at the request of JTutors
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">6. Commission, Payment, and Background Checks</h4>
              <p className="text-gray-700 mb-2">
                All tutors engaged through JTutors are required to undergo a mandatory background check prior to providing services. JTutors will initially cover the cost of the background check, which is $16. This amount will be deducted from the tutor's initial payment.
              </p>
              <p className="text-gray-700">
                JTutors charges a commission fee of 9% on all transactions processed through the platform. Tutors will receive payment of the remaining balance, after commission deduction and any applicable fees, within five (5) working days of the client's payment being received and cleared.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">7. Termination</h4>
              <p className="text-gray-700">
                JTutors may, at its sole discretion, suspend or terminate your account and access to the platform for violation of these terms, with or without notice.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4 mt-8">Independent Contractor Agreement for Tutors on Jtutors.com</h3>
              <p className="text-gray-700 mb-4">
                By creating a tutor profile on Jtutors.com, you ("Tutor") hereby agree to the following terms and conditions, acknowledging your status as an independent contractor:
              </p>
              <div className="space-y-3">
                <p className="text-gray-700">
                  <strong>Independent Contractor Relationship:</strong> The Tutor understands and agrees that their relationship with Jtutors.com is strictly that of an independent contractor. Nothing in this agreement, your profile creation, or your use of the Jtutors.com platform shall be construed to create an employer-employee relationship, partnership, joint venture, or agency relationship between the Tutor and Jtutors.com. The Tutor is solely responsible for determining the methods, means, and manner of performing their tutoring services.
                </p>
                <p className="text-gray-700">
                  <strong>No Employee Benefits:</strong> As an independent contractor, the Tutor is not eligible for, and shall not receive, any employee benefits from Jtutors.com, including, but not limited to, health insurance, paid time off, retirement benefits, unemployment benefits, or workers' compensation.
                </p>
                <p className="text-gray-700">
                  <strong>Taxes:</strong> The Tutor acknowledges and agrees that they are solely responsible for all federal, state, and local taxes, including income tax, self-employment tax, and any other applicable taxes arising from the tutoring services performed through the Jtutors.com platform. Jtutors.com will report payments made to the Tutor as required by law, typically on IRS Form 1099-NEC (Nonemployee Compensation), if the aggregate payments meet the minimum reporting threshold. It is the Tutor's responsibility to consult with a tax professional regarding their tax obligations.
                </p>
                <p className="text-gray-700">
                  <strong>Expenses:</strong> The Tutor is solely responsible for all costs and expenses incurred in connection with the performance of their tutoring services, including, but not limited to, equipment, supplies, internet access, and any other materials.
                </p>
                <p className="text-gray-700">
                  <strong>Control and Discretion:</strong> The Tutor retains complete control over their tutoring schedule, rates, and the specific services they offer. Jtutors.com does not control or direct the Tutor's work performance, nor does it supervise the Tutor's activities while performing services for students.
                </p>
                <p className="text-gray-700">
                  <strong>Indemnification:</strong> The Tutor agrees to indemnify and hold harmless Jtutors.com, its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to the Tutor's performance of services, breach of this agreement, or violation of any applicable law or regulation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t p-6 bg-slate-50">
          <div className="flex items-start mb-4">
            <input
              type="checkbox"
              id="agreeTutorTermsModal"
              className="mt-1 mr-3"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <label htmlFor="agreeTutorTermsModal" className="text-sm text-gray-700">
              I have read and agree to all the terms and conditions stated above. *
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={!agreed}
              className="btn btn-primary flex-1"
            >
              Accept and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TutorTermsModal

