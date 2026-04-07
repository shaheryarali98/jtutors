import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'

interface BackgroundCheckForm {
  fullLegalFirstName: string
  fullLegalLastName: string
  otherNamesUsed: string
  addressLine1: string
  addressLine2: string
  city: string
  stateProvinceRegion: string
  postalCode: string
  country: string
  livedMoreThan3Years: boolean
  dateOfBirth: string
  socialSecurityNumber: string
  hasUSDriverLicense: boolean
  email: string
  consentGiven: boolean
  comments: string
}

interface BackgroundCheckProps {
  onSaveSuccess?: () => void
}

const BackgroundCheck = ({ onSaveSuccess }: BackgroundCheckProps) => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<BackgroundCheckForm>()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchBackgroundCheck()
  }, [])

  const fetchBackgroundCheck = async () => {
    try {
      const response = await api.get('/auth/me')
      const bgCheck = response.data.tutor?.backgroundCheck
      
      if (bgCheck) {
        setSubmitted(true)
        setBackgroundCheckStatus(bgCheck.status)
        // Populate form with existing data
        setValue('fullLegalFirstName', bgCheck.fullLegalFirstName)
        setValue('fullLegalLastName', bgCheck.fullLegalLastName)
        setValue('otherNamesUsed', bgCheck.otherNamesUsed || '')
        setValue('addressLine1', bgCheck.addressLine1)
        setValue('addressLine2', bgCheck.addressLine2 || '')
        setValue('city', bgCheck.city)
        setValue('stateProvinceRegion', bgCheck.stateProvinceRegion)
        setValue('postalCode', bgCheck.postalCode)
        setValue('country', bgCheck.country)
        setValue('livedMoreThan3Years', bgCheck.livedMoreThan3Years)
        // Ensure date format is correct for input type="date"
        if (bgCheck.dateOfBirth) {
          setValue('dateOfBirth', bgCheck.dateOfBirth.split('T')[0])
        }
        setValue('socialSecurityNumber', bgCheck.socialSecurityNumber)
        setValue('hasUSDriverLicense', bgCheck.hasUSDriverLicense)
        setValue('email', bgCheck.email)
        setValue('consentGiven', bgCheck.consentGiven)
        setValue('comments', bgCheck.comments || '')
      }
    } catch (error) {
      console.error('Error fetching background check:', error)
    }
  }

  const onSubmit = async (data: BackgroundCheckForm) => {
    try {
      setLoading(true)
      setFeedback('')
      setErrorMessage('')
      
      await api.post('/tutor/profile/background-check', data)

      // Scroll to the top to ensure success notification is visible
      window.scrollTo(0, 0); 

      setSubmitted(true)
      setBackgroundCheckStatus('PENDING')
      window.dispatchEvent(new Event('tutor-profile-updated'))

      setFeedback('Your background check information was submitted and is awaiting manual review.')
      if (onSaveSuccess) {
        onSaveSuccess()
      }
      
    } catch (error) {
      console.error('Error submitting background check:', error)
      setErrorMessage('Error submitting background check. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="section-title">Background Check</h2>
      <p className="text-gray-600 mb-6">
        JTutors requires a background check for all tutors. Submit your information below and an admin will review it manually.
      </p>

      {feedback && (
        <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">
          {feedback}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg mb-4">
          {errorMessage}
        </div>
      )}

      {submitted && (
        <div className={`mb-6 p-4 rounded-lg ${
          backgroundCheckStatus === 'APPROVED'
            ? 'bg-green-50 border-2 border-green-200'
            : backgroundCheckStatus === 'REJECTED'
            ? 'bg-red-50 border-2 border-red-200'
            : backgroundCheckStatus === 'REVIEW'
            ? 'bg-yellow-50 border-2 border-yellow-200'
            : backgroundCheckStatus === 'EXPIRED'
            ? 'bg-gray-50 border-2 border-gray-200'
            : 'bg-blue-50 border-2 border-blue-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              backgroundCheckStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
              backgroundCheckStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
              backgroundCheckStatus === 'REVIEW'   ? 'bg-yellow-100 text-yellow-800' :
              backgroundCheckStatus === 'EXPIRED'  ? 'bg-gray-100 text-gray-700' :
              'bg-blue-100 text-blue-800'
            }`}>
              {backgroundCheckStatus === 'PENDING' ? 'SUBMITTED' : backgroundCheckStatus}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800">
            {backgroundCheckStatus === 'PENDING' && 'Your background check was submitted and is awaiting manual review. We will notify you once an admin has reviewed it.'}
            {backgroundCheckStatus === 'APPROVED' && 'Your background check has been approved! Your profile is now fully active and visible to students.'}
            {backgroundCheckStatus === 'REJECTED' && 'Your background check was not approved. Please contact support for more information.'}
            {backgroundCheckStatus === 'REVIEW' && 'Your background check requires additional review. Our team will reach out to you shortly.'}
            {backgroundCheckStatus === 'EXPIRED' && 'Your background check submission has expired. Please resubmit below.'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Legal First Name *</label>
            <input
              type="text"
              className="input"
              {...register('fullLegalFirstName', { required: 'First name is required' })}
            />
            {errors.fullLegalFirstName && <p className="error-text">{errors.fullLegalFirstName.message}</p>}
          </div>

          <div>
            <label className="label">Full Legal Last Name *</label>
            <input
              type="text"
              className="input"
              {...register('fullLegalLastName', { required: 'Last name is required' })}
            />
            {errors.fullLegalLastName && <p className="error-text">{errors.fullLegalLastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Other Names Used (maiden/former names)</label>
          <input
            type="text"
            className="input"
            placeholder="Leave blank if none"
            {...register('otherNamesUsed')}
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Current Address</h3>
          
          <div className="space-y-4">
            <div>
              <label className="label">Address Line 1 *</label>
              <input
                type="text"
                className="input"
                {...register('addressLine1', { required: 'Address is required' })}
              />
              {errors.addressLine1 && <p className="error-text">{errors.addressLine1.message}</p>}
            </div>

            <div>
              <label className="label">Address Line 2</label>
              <input
                type="text"
                className="input"
                placeholder="Apt, Suite, etc. (optional)"
                {...register('addressLine2')}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">City *</label>
                <input
                  type="text"
                  className="input"
                  {...register('city', { required: 'City is required' })}
                />
                {errors.city && <p className="error-text">{errors.city.message}</p>}
              </div>

              <div>
                <label className="label">State / Province / Region *</label>
                <input
                  type="text"
                  className="input"
                  {...register('stateProvinceRegion', { required: 'State/Province is required' })}
                />
                {errors.stateProvinceRegion && <p className="error-text">{errors.stateProvinceRegion.message}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Postal Code *</label>
                <input
                  type="text"
                  className="input"
                  {...register('postalCode', { required: 'Postal code is required' })}
                />
                {errors.postalCode && <p className="error-text">{errors.postalCode.message}</p>}
              </div>

              <div>
                <label className="label">Country *</label>
                <input
                  type="text"
                  className="input"
                  {...register('country', { required: 'Country is required' })}
                />
                {errors.country && <p className="error-text">{errors.country.message}</p>}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="livedMoreThan3Years"
                className="mr-2"
                {...register('livedMoreThan3Years')}
              />
              <label htmlFor="livedMoreThan3Years" className="text-sm text-gray-700">
                Have you lived at this address for more than 3 years?
              </label>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="label">Date of Birth * (MM/DD/YYYY)</label>
              <input
                type="date"
                className="input"
                {...register('dateOfBirth', { required: 'Date of birth is required' })}
              />
              {errors.dateOfBirth && <p className="error-text">{errors.dateOfBirth.message}</p>}
            </div>

            <div>
              <label className="label">Social Security Number *</label>
              <input
                type="text"
                className="input"
                placeholder="XXX-XX-XXXX"
                {...register('socialSecurityNumber', { 
                  required: 'SSN is required',
                  pattern: {
                    value: /^\d{3}-?\d{2}-?\d{4}$/,
                    message: 'Invalid SSN format'
                  }
                })}
              />
              {errors.socialSecurityNumber && <p className="error-text">{errors.socialSecurityNumber.message}</p>}
              <p className="text-xs text-gray-600 mt-1">
                Your SSN is encrypted and securely stored
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasUSDriverLicense"
                className="mr-2"
                {...register('hasUSDriverLicense')}
              />
              <label htmlFor="hasUSDriverLicense" className="text-sm text-gray-700">
                Do you hold a current US driver's license?
              </label>
            </div>

            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                className="input"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Additional Comments (optional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Any additional information you'd like to provide..."
                {...register('comments')}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="bg-yellow-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold mb-2">Consent & Agreement</h4>
            <p className="text-sm text-gray-700 mb-3">
              By checking the box below, you certify that:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>All information provided is accurate to the best of your knowledge</li>
              <li>You consent to a background check being performed</li>
              <li>You understand that false information may result in account termination</li>
            </ul>
          </div>

          <div className="flex items-start mb-6">
            <input
              type="checkbox"
              id="consentGiven"
              className="mt-1 mr-2"
              {...register('consentGiven', { required: 'You must give consent' })}
            />
            <label htmlFor="consentGiven" className="text-sm text-gray-700">
              I certify that the information provided is accurate to the best of my knowledge 
              and consent to a background check. *
            </label>
          </div>
          {errors.consentGiven && <p className="error-text">{errors.consentGiven.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || backgroundCheckStatus === 'APPROVED' || backgroundCheckStatus === 'PENDING'}
          className="btn btn-primary w-full md:w-auto disabled:opacity-50"
        >
          {loading
            ? 'Submitting...'
            : backgroundCheckStatus === 'APPROVED'
            ? 'Background Check Approved'
            : backgroundCheckStatus === 'PENDING'
            ? 'Awaiting Review'
            : backgroundCheckStatus === 'EXPIRED'
            ? 'Resubmit Background Check'
            : submitted
            ? 'Update Background Check'
            : 'Submit Background Check'}
        </button>
      </form>
    </div>
  )
}

export default BackgroundCheck