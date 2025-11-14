import { useState } from 'react'
import Navbar from '../../components/Navbar'

import StudentPersonal from '../../components/student/StudentPersonal'
import StudentContact from '../../components/student/StudentContact'
import FavouriteTutors from '../../components/student/FavouriteTutors'
import LearningHours from '../../components/student/LearningHours'
import StudentBookings from '../../components/student/StudentBookings'
import StudentInvoices from '../../components/student/StudentInvoices'

type Section =
  | 'personal'
  | 'contact'
  | 'favourites'
  | 'hours'
  | 'bookings'
  | 'invoices'

const StudentProfile = () => {
  const [activeSection, setActiveSection] = useState<Section>('personal')

  const sections = [
    { id: 'personal' as Section, name: 'Personal Details', icon: '👤' },
    { id: 'contact' as Section, name: 'Contact Details', icon: '☎️' },
    { id: 'favourites' as Section, name: 'Favourite Tutors', icon: '❤️' },
    { id: 'hours' as Section, name: 'Learning Hours', icon: '⏱️' },
    { id: 'bookings' as Section, name: 'My Bookings', icon: '📘' },
    { id: 'invoices' as Section, name: 'Invoices', icon: '🧾' },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'personal':
        return <StudentPersonal />
      case 'contact':
        return <StudentContact />
      case 'favourites':
        return <FavouriteTutors />
      case 'hours':
        return <LearningHours />
      case 'bookings':
        return <StudentBookings />
      case 'invoices':
        return <StudentInvoices />
      default:
        return <StudentPersonal />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Student Profile Setup
          </h1>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
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
            <div className="card">{renderSection()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentProfile
