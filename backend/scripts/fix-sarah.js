const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const u = await p.user.findUnique({
    where: { email: 'sarah.johnson@test.com' },
    include: { tutor: { include: { backgroundCheck: true } } }
  });
  console.log('User:', u?.id);
  console.log('Tutor:', u?.tutor?.id || 'MISSING');
  console.log('BgCheck:', u?.tutor?.backgroundCheck?.status || 'MISSING');

  if (!u?.tutor) {
    console.log('\nCreating tutor profile for Sarah...');
    const subjectRecords = await p.subject.findMany({
      where: { name: { in: ['Algebra 1', 'Algebra 2', 'Calculus', 'Precalculus', 'Statistics'] } }
    });
    const tutor = await p.tutor.create({
      data: {
        userId: u.id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        gender: 'Female',
        tagline: 'Passionate math educator with 8+ years helping students excel in Algebra & Calculus',
        hourlyFee: 45,
        city: 'New York',
        state: 'NY',
        country: 'United States',
        gradesCanTeach: JSON.stringify(['9-12', 'College']),
        languagesSpoken: JSON.stringify(['English', 'Spanish']),
        profileCompleted: true,
        profileCompletionPercentage: 100,
        stripeOnboarded: false,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        backgroundCheckCompleted: true,
        subjects: { create: subjectRecords.map(s => ({ subjectId: s.id })) },
        experiences: { create: [{ jobTitle: 'Teacher', company: 'Lincoln High School', location: 'New York', startDate: new Date('2018-09-01'), isCurrent: false, endDate: new Date('2022-06-30'), teachingMode: 'Online and In-Person', description: 'Full-time math teacher.' }] },
        educations: { create: [{ degreeTitle: 'M.S. Mathematics Education', university: 'New York University', location: 'New York', startDate: new Date('2014-09-01'), endDate: new Date('2018-05-31'), isOngoing: false }] },
        availabilities: { create: [{ blockTitle: 'Weekday Evenings', daysAvailable: JSON.stringify(['Monday','Tuesday','Wednesday','Thursday']), startTime: '17:00', endTime: '21:00', breakTime: 15, sessionDuration: 60, numberOfSlots: 3 }] },
        backgroundCheck: { create: { email: 'sarah.johnson@test.com', fullLegalFirstName: 'Sarah', fullLegalLastName: 'Johnson', city: 'New York', stateProvinceRegion: 'NY', country: 'United States', consentGiven: true, status: 'APPROVED', checkrStatus: 'clear', checkrCompletedAt: new Date() } }
      }
    });
    console.log('Created tutor:', tutor.id);
  }
  
  // Ensure emailConfirmed
  await p.user.update({ where: { email: 'sarah.johnson@test.com' }, data: { emailConfirmed: true } });
  console.log('emailConfirmed set to true');
}

main().catch(console.error).finally(() => p.$disconnect());
