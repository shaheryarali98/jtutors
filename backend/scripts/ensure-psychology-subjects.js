const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categoryName = 'Science';
const subjectNames = [
  'Psychology',
  'Abnormal psychology',
  'Developmental psychology',
];

async function ensureSubject(categoryId, subjectName) {
  const existingSubject = await prisma.subject.findUnique({
    where: { name: subjectName },
  });

  if (!existingSubject) {
    await prisma.subject.create({
      data: {
        name: subjectName,
        parentId: categoryId,
      },
    });
    console.log(`Created subject: ${subjectName}`);
    return;
  }

  if (existingSubject.parentId !== categoryId) {
    await prisma.subject.update({
      where: { id: existingSubject.id },
      data: { parentId: categoryId },
    });
    console.log(`Updated ${subjectName} parent category to ${categoryName}`);
    return;
  }

  console.log(`${subjectName} subject already configured`);
}

async function main() {
  const category = await prisma.subject.upsert({
    where: { name: categoryName },
    update: {},
    create: {
      name: categoryName,
      parentId: null,
    },
  });

  for (const subjectName of subjectNames) {
    await ensureSubject(category.id, subjectName);
  }
}

main()
  .catch((error) => {
    console.error('Failed to ensure psychology subjects:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
