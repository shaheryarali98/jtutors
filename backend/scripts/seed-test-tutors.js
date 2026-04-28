/**
 * Seeds 3 fully-approved test tutors into the local dev database.
 * Run with: node scripts/seed-test-tutors.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const tutors = [
  {
    email: 'sarah.johnson@test.com',
    password: 'Test1234!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    gender: 'Female',
    tagline: 'Passionate math educator with 8+ years helping students excel in Algebra & Calculus',
    hourlyFee: 45,
    city: 'New York',
    state: 'NY',
    country: 'United States',
    gradesCanTeach: ['9-12', 'College'],
    languagesSpoken: ['English', 'Spanish'],
    subjects: ['Algebra 1', 'Algebra 2', 'Calculus', 'Precalculus', 'Statistics'],
  },
  {
    email: 'david.chen@test.com',
    password: 'Test1234!',
    firstName: 'David',
    lastName: 'Chen',
    gender: 'Male',
    tagline: 'Computer Science tutor specializing in Python, Java, and web development',
    hourlyFee: 60,
    city: 'San Francisco',
    state: 'CA',
    country: 'United States',
    gradesCanTeach: ['9-12', 'College', 'Adult'],
    languagesSpoken: ['English', 'Mandarin'],
    subjects: ['Python', 'Java', 'Javascript', 'Computer Science', 'Data Structures', 'Web Design'],
  },
  {
    email: 'emily.rodriguez@test.com',
    password: 'Test1234!',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    gender: 'Female',
    tagline: 'English & Writing coach helping students find their voice and ace essays',
    hourlyFee: 40,
    city: 'Chicago',
    state: 'IL',
    country: 'United States',
    gradesCanTeach: ['K-5', '6-8', '9-12'],
    languagesSpoken: ['English', 'Spanish'],
    subjects: ['English', 'Essay Writing', 'Creative Writing', 'Reading', 'Grammar', 'SAT Writing'],
  },
];

async function main() {
  console.log('🌱 Seeding test tutors...\n');

  for (const tutorData of tutors) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: tutorData.email } });
    if (existing) {
      console.log(`⚠️  Tutor ${tutorData.email} already exists — skipping.`);
      continue;
    }

    // 1. Create user (email confirmed)
    const hashedPassword = await bcrypt.hash(tutorData.password, 10);
    const user = await prisma.user.create({
      data: {
        email: tutorData.email,
        password: hashedPassword,
        role: 'TUTOR',
        emailConfirmed: true,
      },
    });

    // 2. Resolve subject IDs
    const subjectRecords = await prisma.subject.findMany({
      where: { name: { in: tutorData.subjects } },
    });

    // 3. Create tutor profile
    const tutor = await prisma.tutor.create({
      data: {
        userId: user.id,
        firstName: tutorData.firstName,
        lastName: tutorData.lastName,
        gender: tutorData.gender,
        tagline: tutorData.tagline,
        hourlyFee: tutorData.hourlyFee,
        city: tutorData.city,
        state: tutorData.state,
        country: tutorData.country,
        gradesCanTeach: JSON.stringify(tutorData.gradesCanTeach),
        languagesSpoken: JSON.stringify(tutorData.languagesSpoken),
        profileCompleted: true,
        profileCompletionPercentage: 100,
        stripeOnboarded: false,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        // Link subjects
        subjects: {
          create: subjectRecords.map((s) => ({
            subjectId: s.id,
          })),
        },
        // Add experience
        experiences: {
          create: [
            {
              jobTitle: tutorData.firstName === 'David' ? 'Software Engineer' : 'Teacher',
              company: tutorData.firstName === 'David' ? 'Tech Corp' : 'Lincoln High School',
              location: tutorData.city,
              startDate: new Date('2018-09-01'),
              isCurrent: false,
              endDate: new Date('2022-06-30'),
              teachingMode: 'Online and In-Person',
              description: 'Full-time position working with students of various levels.',
            },
          ],
        },
        // Add education
        educations: {
          create: [
            {
              degreeTitle: tutorData.firstName === 'David' ? 'B.S. Computer Science' : tutorData.firstName === 'Sarah' ? 'M.S. Mathematics Education' : 'B.A. English Literature',
              university: tutorData.firstName === 'David' ? 'UC Berkeley' : tutorData.firstName === 'Sarah' ? 'New York University' : 'University of Chicago',
              location: tutorData.city,
              startDate: new Date('2014-09-01'),
              endDate: new Date('2018-05-31'),
              isOngoing: false,
            },
          ],
        },
        // Add availability
        availabilities: {
          create: [
            {
              blockTitle: 'Weekday Evenings',
              daysAvailable: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday']),
              startTime: '17:00',
              endTime: '21:00',
              breakTime: 15,
              sessionDuration: 60,
              numberOfSlots: 3,
            },
            {
              blockTitle: 'Weekends',
              daysAvailable: JSON.stringify(['Saturday', 'Sunday']),
              startTime: '10:00',
              endTime: '16:00',
              breakTime: 15,
              sessionDuration: 60,
              numberOfSlots: 4,
            },
          ],
        },
        // Create APPROVED background check
        backgroundCheck: {
          create: {
            email: tutorData.email,
            fullLegalFirstName: tutorData.firstName,
            fullLegalLastName: tutorData.lastName,
            city: tutorData.city,
            stateProvinceRegion: tutorData.state,
            country: tutorData.country,
            consentGiven: true,
            status: 'APPROVED',
            checkrStatus: 'clear',
            checkrCompletedAt: new Date(),
          },
        },
      },
    });

    // 4. Mark backgroundCheckCompleted on tutor
    await prisma.tutor.update({
      where: { id: tutor.id },
      data: { backgroundCheckCompleted: true },
    });

    console.log(`✅ Created tutor: ${tutorData.firstName} ${tutorData.lastName} (${tutorData.email})`);
    console.log(`   Subjects: ${tutorData.subjects.join(', ')}`);
    console.log(`   Rate: $${tutorData.hourlyFee}/hr | Location: ${tutorData.city}, ${tutorData.state}\n`);
  }

  console.log('🎉 Test tutors seeded successfully!');
  console.log('\nCredentials:');
  tutors.forEach(t => {
    console.log(`  ${t.firstName} ${t.lastName}: ${t.email} / ${t.password}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
