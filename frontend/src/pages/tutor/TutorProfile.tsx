import { useState, useEffect } from 'react'
import api from '../../lib/api'
import Navbar from '../../components/Navbar'
import PersonalInformation from '../../components/tutor/PersonalInformation'
import Experience from '../../components/tutor/Experience'
import Education from '../../components/tutor/Education'
import Subjects from '../../components/tutor/Subjects'
import Availability from '../../components/tutor/Availability'
import PayoutMethod from '../../components/tutor/PayoutMethod'
import BackgroundCheck from '../../components/tutor/BackgroundCheck'
import TutorTermsModal from '../../components/tutor/TutorTermsModal'
import ProfileProgress from '../../components/tutor/ProfileProgress'
import Footer from '../../components/Footer'

type Section = 'personal' | 'experience' | 'education' | 'subjects' | 'availability' | 'payout' | 'background' | 'terms'

const TutorProfile = () => {
  const [activeSection, setActiveSection] = useState<Section>('personal')
  const [showTermsModal, setShowTermsModal] = useState(false)

  useEffect(() => {
    const checkBackgroundCheck = async () => {
      try {
        const response = await api.get('/auth/me')
        const bgCheck = response.data.tutor?.backgroundCheck
        if (bgCheck && bgCheck.status === 'PENDING' && !response.data.tutor?.termsAccepted) {
          setShowTermsModal(true)
        }
      } catch (error) {
        console.error('Error checking background check:', error)
      }
    }
    checkBackgroundCheck()
  }, [])

  const sections = [
    { id: 'personal' as Section, name: 'Personal Information', icon: '👤' },
    { id: 'experience' as Section, name: 'Experience', icon: '💼' },
    { id: 'education' as Section, name: 'Education', icon: '🎓' },
    { id: 'subjects' as Section, name: 'Subjects', icon: '📚' },
    { id: 'availability' as Section, name: 'Availability', icon: '📅' },
    { id: 'payout' as Section, name: 'Payout Method', icon: '💳' },
    { id: 'background' as Section, name: 'Background Check', icon: '✓' },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'personal':
        return <PersonalInformation />
      case 'experience':
        return <Experience />
      case 'education':
        return <Education />
      case 'subjects':
        return <Subjects />
      case 'availability':
        return <Availability />
      case 'payout':
        return <PayoutMethod />
      case 'background':
        return <BackgroundCheck onSubmitted={() => setShowTermsModal(true)} />
      default:
        return <PersonalInformation />
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#012c4f' }}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Tutor Profile Setup</h1>
          <ProfileProgress />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="card space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                    activeSection === section.id
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2 text-xl">{section.icon}</span>
                  <span className="text-sm">{section.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card">
              {renderSection()}
            </div>
          </div>
        </div>
      </div>

      <TutorTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={async () => {
          try {
            // TODO: Save terms acceptance to backend
            // await api.post('/tutor/accept-terms')
            setShowTermsModal(false)
          } catch (error) {
            console.error('Error accepting terms:', error)
          }
        }}
      />
      <Footer />
    </div>
  )
}

export default TutorProfile

