// Seed script to add initial subjects to the database
// Run with: node scripts/seed.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const subjects = [
  'Mathematics',
  'English',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Computer Science',
  'Programming',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Art',
  'Music',
  'Physical Education',
  'Economics',
  'Business Studies',
  'Psychology',
  'Sociology',
  'Philosophy',
  'Literature',
  'Writing',
  'Reading',
  'Algebra',
  'Geometry',
  'Calculus',
  'Statistics',
  'SAT Prep',
  'ACT Prep',
  'Test Prep',
  'Essay Writing',
  'Public Speaking',
];

async function main() {
  console.log('Starting to seed subjects...');

  for (const subjectName of subjects) {
    try {
      await prisma.subject.create({
        data: { name: subjectName },
      });
      console.log(`✓ Created subject: ${subjectName}`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`⊘ Subject already exists: ${subjectName}`);
      } else {
        console.error(`✗ Error creating subject ${subjectName}:`, error);
      }
    }
  }

  console.log('\nSeeding completed!');
  
  const count = await prisma.subject.count();
  console.log(`Total subjects in database: ${count}`);

  const existingSettings = await prisma.adminSettings.findFirst();
  if (!existingSettings) {
    await prisma.adminSettings.create({
      data: {
        sendSignupConfirmation: true,
        sendProfileCompletionEmail: true,
      },
    });
    console.log('✓ Created default admin settings');
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@jtutor.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        emailConfirmed: true,
      },
    });

    console.log(`✓ Created default admin user (${adminEmail})`);
  } else {
    console.log(`⊘ Admin user already exists (${adminEmail})`);
  }
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

