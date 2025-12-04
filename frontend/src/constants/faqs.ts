export interface FAQItem {
  question: string
  answer: string
}

export const faqs: FAQItem[] = [
  {
    question: 'What is JTutors?',
    answer: 'JTutors is a tutoring marketplace and platform designed specifically for the Jewish community.'
  },
  {
    question: 'What is a tutoring marketplace?',
    answer: 'A tutoring marketplace is a website where students and parents can browse tutor profiles and hire the tutor that best fits their educational needs, schedule, and budget.'
  },
  {
    question: 'What is a tutoring platform?',
    answer: 'A tutoring platform allows tutors and students to manage all aspects of the tutoring process in one place. On JTutors, tutors post available schedules, students choose preferred time slots, and all payments are processed directly through the site.'
  },
  {
    question: 'What subjects are available on JTutors?',
    answer: 'JTutors offers both secular and Judaic studies, including math, science, writing, test prep, Hebrew, Chumash, Gemara, Bar/Bat Mitzvah preparation, and more.'
  },
  {
    question: 'Can tutors work with groups or only individual students?',
    answer: 'Tutors can offer both one-on-one and small group sessions. Group capacity and pricing are determined by the individual tutor.'
  },
  {
    question: 'What tools does JTutors provide for tutoring?',
    answer: 'Every tutor and student receives a unique JTutors Google account. Tutors create a Google Classroom for each student, which can include parents and teachers as collaborators. Online tutoring sessions take place through Google Meet. Materials and communication are managed through Google Classroom, Drive, and Meet.'
  },
  {
    question: 'Can parents monitor their child\'s progress?',
    answer: 'Yes. Parents can be added as collaborators in the student\'s Google Classroom, giving them access to assignments, session notes, and communication—depending on how the tutor sets it up.'
  },
  {
    question: 'How do tutors and students communicate on JTutors?',
    answer: 'JTutors has a secure internal messaging system for safe and convenient communication between tutors, students, and parents.'
  },
  {
    question: 'Where do tutoring sessions take place?',
    answer: 'JTutors supports both online and in-person tutoring. Tutors specify in their profiles whether they offer in-person, online, or both. In-person arrangements are made directly between tutor and student.'
  },
  {
    question: 'Are online sessions recorded?',
    answer: 'Tutors may choose to record sessions through Google Meet. Recording is optional and requires consent from both the tutor and the student (or a parent if the student is a minor).'
  },
  {
    question: 'Do you offer support for students with learning differences (IEPs, ADHD, Dyslexia, etc.)?',
    answer: 'Many tutors specialize in special education and learning differences. You can filter tutors by their certifications and expertise.'
  },
  {
    question: 'How does JTutors vet tutors?',
    answer: 'All tutors must pass a background check before their profiles are approved. Tutors are independent contractors, not employees of JTutors. Parents are encouraged to request references and conduct additional due diligence.'
  },
  {
    question: 'Do tutors receive reviews or ratings?',
    answer: 'Yes. Students and parents are encouraged to leave feedback and ratings after sessions to help others make informed decisions.'
  },
  {
    question: 'What is the financial arrangement for tutors?',
    answer: 'Tutors can create their profiles free of charge. JTutors collects a 9.25% commission on each tutoring session—15% below the national average. This applies to both in-person and online sessions.'
  },
  {
    question: 'How are payments processed?',
    answer: 'Tutors connect a Stripe account to their JTutors Google account. Once a scheduled session is completed, Stripe automatically processes the payment. All sessions must be scheduled through the JTutors system to ensure payment.'
  },
  {
    question: 'What if I am not satisfied with a tutor?',
    answer: 'You can stop working with a tutor at any time and hire a different one through the platform. JTutors does not require long-term commitments.'
  },
  {
    question: 'What is the cancellation or rescheduling policy?',
    answer: 'Students must cancel sessions 24 hours in advance. If a session is cancelled within 24 hours it is in the tutor\'s discretion to grant a refund. Full refunds are always granted when the tutor cancels the session. All changes must be handled through the JTutors platform to ensure proper communication and billing.'
  },
  {
    question: 'Can I start working with a tutor through JTutors and then take the relationship off-platform?',
    answer: 'No. As stated in the terms and conditions, all tutoring sessions must be scheduled and processed through JTutors for the duration of the tutoring relationship. Off-platform tutoring may result in account termination for both tutor and student.'
  },
  {
    question: 'Who do I contact for support?',
    answer: 'For platform or marketplace issues, email info@jtutors.com. For website technical support, email support@jtutors.com.'
  }
]

