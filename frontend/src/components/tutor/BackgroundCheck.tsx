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
  onSubmitted?: () => void
}

const BackgroundCheck = ({ onSubmitted }: BackgroundCheckProps) => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<BackgroundCheckForm>()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

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
        setValue('dateOfBirth', bgCheck.dateOfBirth.split('T')[0])
        setValue('hasUSDriverLicense', bgCheck.hasUSDriverLicense)
        setValue('email', bgCheck.email)
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
      setSubmitted(true)
      setBackgroundCheckStatus('PENDING')
      setFeedback('Background check submitted successfully. Please review and accept the Terms and Conditions to continue.')
      window.dispatchEvent(new Event('tutor-profile-updated'))
      if (onSubmitted) {
        onSubmitted()
      }
      setTimeout(() => setFeedback(''), 4000)
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
        To ensure the safety and trust of our platform, all tutors must complete a background check.
      </p>
      <p className="text-gray-700 mb-6 font-medium">
        JTutors will incur the cost of the background check.
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
            : 'bg-blue-50 border-2 border-blue-200'
        }`}>
          <h3 className="font-bold mb-2">
            Status: {backgroundCheckStatus}
          </h3>
          <p className="text-sm">
            {backgroundCheckStatus === 'PENDING' && 'Your background check is being processed. We will notify you once it is complete.'}
            {backgroundCheckStatus === 'APPROVED' && 'Your background check has been approved!'}
            {backgroundCheckStatus === 'REJECTED' && 'Your background check was not approved. Please contact support.'}
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
              <label className="label">Date of Birth *</label>
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
          disabled={loading || (submitted && backgroundCheckStatus === 'APPROVED')}
          className="btn btn-primary w-full md:w-auto"
        >
          {loading ? 'Submitting...' : submitted ? 'Update Background Check' : 'Submit Background Check'}
        </button>
      </form>
    </div>
  )
}

export default BackgroundCheck


