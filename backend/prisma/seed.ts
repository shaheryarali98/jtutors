// E:\coding\jTutors\jtutors\backend\prisma\seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 1. Define the actual data structure
const subjectData = [
    // --- CATEGORIES (parentId: null) ---
    { name: 'Mathematics' },
    { name: 'Science & Technology' },
    { name: 'Languages' },
    { name: 'Humanities & Arts' },
]

// 2. Define the sub-subjects linked by name (temporary)
const subSubjectData = [
    // Mathematics subjects
    { name: 'Algebra I & II', categoryName: 'Mathematics' },
    { name: 'Geometry', categoryName: 'Mathematics' },
    { name: 'Calculus (AP/IB)', categoryName: 'Mathematics' },
    { name: 'Statistics', categoryName: 'Mathematics' },

    // Science & Technology subjects
    { name: 'Physics (General)', categoryName: 'Science & Technology' },
    { name: 'Chemistry (AP/IB)', categoryName: 'Science & Technology' },
    { name: 'Biology', categoryName: 'Science & Technology' },
    { name: 'Computer Science (Python/Java)', categoryName: 'Science & Technology' },

    // Languages subjects
    { name: 'English Literature', categoryName: 'Languages' },
    { name: 'Spanish', categoryName: 'Languages' },
    { name: 'French', categoryName: 'Languages' },
    
    // Humanities & Arts subjects
    { name: 'World History', categoryName: 'Humanities & Arts' },
    { name: 'Economics', categoryName: 'Humanities & Arts' },
    { name: 'Psychology', categoryName: 'Humanities & Arts' },
    { name: 'Art History', categoryName: 'Humanities & Arts' },
]

async function main() {
  console.log('Start seeding subjects...')

  // --- 1. Create Categories ---
  const categoriesMap = new Map<string, string>();

  for (const data of subjectData) {
    const category = await prisma.subject.upsert({
      where: { name: data.name },
      update: {},
      create: { 
        name: data.name,
        parentId: null // Top-level categories have no parent
      },
    })
    categoriesMap.set(data.name, category.id);
    console.log(`Created category: ${category.name} (${category.id})`);
  }

  // --- 2. Create Sub-Subjects and link them ---
  for (const data of subSubjectData) {
    const parentId = categoriesMap.get(data.categoryName);
    
    if (parentId) {
      const subject = await prisma.subject.upsert({
        where: { name: data.name },
        update: { 
            parentId: parentId 
        },
        create: {
          name: data.name,
          parentId: parentId, // Link to the parent category's ID
        },
      })
      console.log(`Created subject: ${subject.name} under ${data.categoryName}`);
    } else {
        console.error(`ERROR: Could not find parent ID for category: ${data.categoryName}`);
    }
  }
  
  console.log('Subject seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
   await prisma.$disconnect()
  })