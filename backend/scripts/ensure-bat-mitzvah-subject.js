const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const categoryName = 'Jewish Studies';
  const subjectName = 'Bat Mitzvah';

  const category = await prisma.subject.upsert({
    where: { name: categoryName },
    update: {},
    create: {
      name: categoryName,
      parentId: null,
    },
  });

  const existingSubject = await prisma.subject.findUnique({
    where: { name: subjectName },
  });

  if (!existingSubject) {
    await prisma.subject.create({
      data: {
        name: subjectName,
        parentId: category.id,
      },
    });
    console.log('Created subject: Bat Mitzvah');
    return;
  }

  if (existingSubject.parentId !== category.id) {
    await prisma.subject.update({
      where: { id: existingSubject.id },
      data: { parentId: category.id },
    });
    console.log('Updated Bat Mitzvah parent category to Jewish Studies');
    return;
  }

  console.log('Bat Mitzvah subject already configured');
}

main()
  .catch((error) => {
    console.error('Failed to ensure Bat Mitzvah subject:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
