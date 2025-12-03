// Script to update old avatar URLs in the database
// Run with: node scripts/update-avatar-urls.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OLD_TUTOR_URLS = [
  'https://api.dicebear.com/7.x/avataaars/png?seed=Tutor&backgroundColor=f59e0b&size=400&radius=50',
  'https://api.dicebear.com/7.x/notionists/png?seed=Tutor&backgroundColor=f59e0b&size=400',
];

const OLD_STUDENT_URLS = [
  'https://api.dicebear.com/7.x/avataaars/png?seed=Student&backgroundColor=4f46e5&size=400&radius=50',
  'https://api.dicebear.com/7.x/notionists/png?seed=Student&backgroundColor=4f46e5&size=400',
];

const NEW_TUTOR_IMAGE = 'https://api.dicebear.com/7.x/micah/png?seed=Tutor&backgroundColor=f59e0b&size=400';
const NEW_STUDENT_IMAGE = 'https://api.dicebear.com/7.x/micah/png?seed=Student&backgroundColor=4f46e5&size=400';

async function main() {
  console.log('🔄 Updating avatar URLs...\n');

  try {
    // Update AdminSettings
    const settings = await prisma.adminSettings.findFirst();
    if (settings) {
      let updated = false;
      const updateData = {};

      if (OLD_TUTOR_URLS.includes(settings.defaultTutorImage)) {
        updateData.defaultTutorImage = NEW_TUTOR_IMAGE;
        updated = true;
        console.log('✓ Updating default tutor image in AdminSettings');
      }

      if (OLD_STUDENT_URLS.includes(settings.defaultStudentImage)) {
        updateData.defaultStudentImage = NEW_STUDENT_IMAGE;
        updated = true;
        console.log('✓ Updating default student image in AdminSettings');
      }

      if (updated) {
        await prisma.adminSettings.update({
          where: { id: settings.id },
          data: updateData,
        });
        console.log('✅ AdminSettings updated successfully\n');
      } else {
        console.log('ℹ️  AdminSettings already has new avatar URLs\n');
      }
    } else {
      console.log('ℹ️  No AdminSettings found (will be created with defaults)\n');
    }

    // Update Tutors with old avatar URLs
    const tutorsWithOldAvatars = await prisma.tutor.findMany({
      where: {
        profileImage: {
          in: OLD_TUTOR_URLS,
        },
      },
    });

    if (tutorsWithOldAvatars.length > 0) {
      console.log(`📝 Found ${tutorsWithOldAvatars.length} tutor(s) with old avatar URLs`);
      for (const tutor of tutorsWithOldAvatars) {
        await prisma.tutor.update({
          where: { id: tutor.id },
          data: { profileImage: NEW_TUTOR_IMAGE },
        });
        console.log(`  ✓ Updated tutor: ${tutor.firstName} ${tutor.lastName}`);
      }
      console.log('✅ Tutors updated successfully\n');
    } else {
      console.log('ℹ️  No tutors found with old avatar URLs\n');
    }

    // Update Students with old avatar URLs
    const studentsWithOldAvatars = await prisma.student.findMany({
      where: {
        profileImage: {
          in: OLD_STUDENT_URLS,
        },
      },
    });

    if (studentsWithOldAvatars.length > 0) {
      console.log(`📝 Found ${studentsWithOldAvatars.length} student(s) with old avatar URLs`);
      for (const student of studentsWithOldAvatars) {
        await prisma.student.update({
          where: { id: student.id },
          data: { profileImage: NEW_STUDENT_IMAGE },
        });
        console.log(`  ✓ Updated student: ${student.firstName} ${student.lastName}`);
      }
      console.log('✅ Students updated successfully\n');
    } else {
      console.log('ℹ️  No students found with old avatar URLs\n');
    }

    console.log('✨ Avatar URL update completed!');
  } catch (error) {
    console.error('❌ Error updating avatar URLs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  });

