const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Migration script to:
 * 1. Remove specific subjects from the database
 * 2. Rename specific subjects
 * 3. Move "Quantum Physics" from Mathematics to Science
 *
 * This script preserves tutor-subject associations where possible (renames keep associations).
 * Deleted subjects will cascade-remove their tutor associations.
 */
async function main() {
  console.log('--- SUBJECT MIGRATION START ---\n');

  // 1. SUBJECTS TO DELETE (by name)
  const subjectsToDelete = [
    // Standardized Tests
    'PSAT',
    'Series 3',
    'Series 6',
    'Series 7',
    'Series 63',
    'Series 65',
    'Series 66',
    // Mathematics
    'Econometrics',
    // History / Social Studies
    'Classics',
    'Religion',
    'Government and Politics',
    'Economics',      // the one under History/Social Studies (will be re-added under Business/Law via rename)
    'Social Studies',
    'Social Work',
    // Business / Law
    'Sports Medicine',
    'Career Development',
    // Music / Art
    'Adobe Flash',
    'Cosmetology',
    'Ear Training',
    'French Horn',
    'General Music',
    'Saxophone',
    'Sight Singing',
  ];

  // 2. SUBJECTS TO RENAME
  const subjectsToRename = [
    { from: 'Macroeconomics', to: 'Economics' },
    { from: 'Theatre', to: 'Acting' },
    { from: 'Voice (Music)', to: 'Voice Training' },
  ];

  // 3. MOVE: Quantum Physics from Mathematics to Science
  const subjectToMove = { name: 'Quantum Physics', newParent: 'Science' };

  // --- Execute renames first (before deletes, since "Economics" in History will be deleted) ---
  console.log('Step 1: Renaming subjects...');

  // First, handle the Economics conflict:
  // - "Economics" exists under History/Social Studies (will be deleted)
  // - "Macroeconomics" under Business/Law should be renamed to "Economics"
  // We need to delete the History one first, then rename Macroeconomics

  // Find and delete "Economics" under "History / Social Studies" first
  const historyCategory = await prisma.subject.findFirst({
    where: { name: 'History / Social Studies', parentId: null }
  });

  if (historyCategory) {
    const historyEconomics = await prisma.subject.findFirst({
      where: { name: 'Economics', parentId: historyCategory.id }
    });
    if (historyEconomics) {
      // Delete tutor associations first
      await prisma.tutorSubject.deleteMany({ where: { subjectId: historyEconomics.id } });
      await prisma.subject.delete({ where: { id: historyEconomics.id } });
      console.log('  Deleted "Economics" from History / Social Studies');
    }
  }

  // Now do renames
  for (const { from, to } of subjectsToRename) {
    const subject = await prisma.subject.findFirst({ where: { name: from } });
    if (subject) {
      await prisma.subject.update({
        where: { id: subject.id },
        data: { name: to }
      });
      console.log(`  Renamed "${from}" → "${to}" (tutor associations preserved)`);
    } else {
      console.log(`  ⚠ Subject "${from}" not found, skipping rename`);
    }
  }

  // --- Execute deletes ---
  console.log('\nStep 2: Deleting subjects...');
  // Remove "Economics" from delete list since we already handled it above
  const remainingDeletes = subjectsToDelete.filter(name => name !== 'Economics');

  for (const name of remainingDeletes) {
    const subject = await prisma.subject.findFirst({ where: { name } });
    if (subject) {
      const tutorCount = await prisma.tutorSubject.count({ where: { subjectId: subject.id } });
      await prisma.tutorSubject.deleteMany({ where: { subjectId: subject.id } });
      await prisma.subject.delete({ where: { id: subject.id } });
      console.log(`  Deleted "${name}" (removed ${tutorCount} tutor associations)`);
    } else {
      console.log(`  ⚠ Subject "${name}" not found, skipping`);
    }
  }

  // --- Execute move ---
  console.log('\nStep 3: Moving subjects...');
  const scienceCategory = await prisma.subject.findFirst({
    where: { name: subjectToMove.newParent, parentId: null }
  });
  const quantumPhysics = await prisma.subject.findFirst({
    where: { name: subjectToMove.name }
  });

  if (quantumPhysics && scienceCategory) {
    if (quantumPhysics.parentId !== scienceCategory.id) {
      await prisma.subject.update({
        where: { id: quantumPhysics.id },
        data: { parentId: scienceCategory.id }
      });
      console.log(`  Moved "${subjectToMove.name}" to "${subjectToMove.newParent}" (tutor associations preserved)`);
    } else {
      console.log(`  "${subjectToMove.name}" is already under "${subjectToMove.newParent}"`);
    }
  } else {
    if (!quantumPhysics) console.log(`  ⚠ Subject "${subjectToMove.name}" not found`);
    if (!scienceCategory) console.log(`  ⚠ Category "${subjectToMove.newParent}" not found`);
  }

  // --- Summary ---
  console.log('\n--- MIGRATION COMPLETE ---');
  const categoryCount = await prisma.subject.count({ where: { parentId: null } });
  const subjectCount = await prisma.subject.count({ where: { parentId: { not: null } } });
  console.log(`Total categories: ${categoryCount}`);
  console.log(`Total subjects: ${subjectCount}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
