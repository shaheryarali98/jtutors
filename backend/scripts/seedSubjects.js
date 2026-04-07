const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to capitalize first letter
function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const subjectCategories = {
  'Standardized Tests': [
    'ACT',
    'ACT English',
    'ACT Math',
    'ACT Reading',
    'ACT Science',
    'DAT',
    'GED',
    'GMAT',
    'GRE',
    'IELTS',
    'LSAT',
    'MCAT',
    'PCAT',
    'SAT',
    'SAT Math',
    'SAT Reading',
    'SAT Writing',
    'TOEFL',
  ],
  'Mathematics': [
    'Actuarial science',
    'Algebra 1',
    'Algebra 2',
    'Calculus',
    'Discrete math',
    'Elementary math',
    'Geometry',
    'Linear algebra',
    'Logic',
    'Precalculus',
    'Prealgebra',
    'Probability',
    'Statistics',
    'Trigonometry',
  ],
  'Science': [
    'Anatomy',
    'Astronomy',
    'Biochemistry',
    'Biology',
    'Biostatistics',
    'Botany',
    'Chemical engineering',
    'Chemistry',
    'Civil engineering',
    'Ecology',
    'Earth science',
    'Quantum physics',
    'Environmental science',
    'Epidemiology',
    'Genetics',
    'Geology',
    'Mechanical engineering',
    'Microbiology',
    'Neuroscience',
    'Nursing',
    'Nutrition',
    'Organic chemistry',
    'Pharmacology',
    'Physical science',
    'Physics',
    'Physiology',
    'Zoology',
  ],
  'Computer Science / Technology': [
    'AWS',
    'COBOL',
    'Common Core',
    'Computer engineering',
    'Computer gaming (game design)',
    'Computer programming',
    'Computer science',
    'Cybersecurity',
    'Data analysis',
    'Data science',
    'Data structures',
    'DOS',
    'Dreamweaver',
    'General computer',
    'GIS',
    'HTML',
    'Information Technology',
    'Java',
    'Javascript',
    'JQuery',
    'Linux',
    'Macintosh',
    'Machine Learning/AI',
    'Mathematica',
    'MATLAB',
    'Microsoft 365',
    'Microsoft Access',
    'Microsoft Excel',
    'Microsoft Outlook',
    'Microsoft PowerPoint',
    'Microsoft Publisher',
    'Microsoft Windows',
    'Microsoft Word',
    'Networking (computer)',
    'Oracle',
    'Pascal',
    'Perl',
    'Python',
    'QuickBooks',
    'R',
    'React',
    'Revit',
    'Robotics',
    'Ruby',
    'Sketchup',
    'Solidworks',
    'SPSS',
    'SQL',
    'STATA',
    'Swift',
    'Tableau',
    'Unity',
    'UNIX',
    'Unreal Engine',
    'Visual Basic',
    'Web design',
  ],
  'Languages': [
    'Accent reduction',
    'Braille',
    'Bulgarian',
    'Czech',
    'Dutch',
    'ESL/ESOL',
    'Farsi',
    'French',
    'Greek',
    'Hebrew',
    'Hebrew language',
    'Hindi',
    'Hungarian',
    'Indonesian',
    'Italian',
    'Korean',
    'Latin',
    'Polish',
    'Portuguese',
    'Romanian',
    'Russian',
    'Sign language',
    'Spanish',
    'Thai',
    'Turkish',
    'Urdu',
  ],
  'History / Social Studies': [
    'African American Studies',
    'American history',
    'Anthropology',
    'Archaeology',
    'Criminology / Criminal justice',
    'Debate',
    'European history',
    'History of Israel',
    'Holocaust studies',
    'Jewish history',
    'Political science',
    'Sociology',
    'United States history',
    'World history',
    'Zionism',
  ],
  'Business / Law': [
    'Business',
    'Entrepreneurship',
    'Finance',
    'Financial accounting',
    'Interview prep',
    'Law',
    'Legal writing',
    'Economics',
    'Managerial accounting',
    'Marketing',
    'MBA',
    'Project management',
    'Real estate',
    'Sports management',
    'Tax accounting',
  ],
  'Jewish Studies': [
    'Bar Mitzvah',
    'Chassidus',
    'Chumash',
    'Conversational Hebrew',
    'Halacha',
    'Hebrew Language',
    'Jewish law',
    'Jewish philosophy',
    'Kriyah',
    'Leining',
    'Mussar',
    'Navih',
    'Talmud',
    'Tanach',
    'Tefillah',
    'Torah reading',
  ],
  'English / Literature / Writing': [
    'American literature',
    'British literature',
    'Creative writing',
    'English',
    'Essay writing',
    'Fiction writing',
    'Grammar',
    'Literacy',
    'Linguistics',
    'Proofreading',
    'Reading',
    'Spelling',
    'Vocabulary',
    'Writing',
  ],
  'Music / Art': [
    'Adobe After Effects',
    'Adobe Illustrator',
    'Adobe InDesign',
    'Adobe Lightroom',
    'Adobe Photoshop',
    'Adobe Premier',
    'Art history',
    'Art theory',
    'Composition (music)',
    'Drawing',
    'Drums',
    'Film',
    'Flute',
    'Graphic design',
    'Guitar',
    'Music history',
    'Music production',
    'Music theory',
    'Painting',
    'Photography',
    'Piano',
    'Songwriting',
    'Acting',
    'Video production',
    'Violin',
    'Voice Training',
  ],
  'Other / Skills': [
    'Architecture',
    'Handwriting',
    'Homeschool',
    'Literacy',
    'Study skills',
    'Public speaking',
    'Speech',
  ],
};

async function main() {
  console.log('Starting to seed subjects...');

  try {
    // Delete all existing subjects first
    console.log('Clearing existing subjects...');
    await prisma.tutorSubject.deleteMany({});
    
    // Delete old categories that should be removed
    const oldCategoriesToRemove = [
      'Science, Medicine & Engineering',
      'Sports, Fitness & Recreation',
      'Technology & Computer Science',
      'Test Preparation',
      'Humanities & Social Studies',
      'Arts, Music & Design',
      'Mathematics & Statistics',
    ];
    
    console.log('Removing old categories...');
    for (const oldCat of oldCategoriesToRemove) {
      const oldCategory = await prisma.subject.findFirst({
        where: { name: oldCat },
      });
      if (oldCategory) {
        // Delete all subcategories first
        await prisma.subject.deleteMany({
          where: { parentId: oldCategory.id },
        });
        // Delete the category
        await prisma.subject.delete({
          where: { id: oldCategory.id },
        });
        console.log(`  Removed old category: ${oldCat}`);
      }
    }
    
    // Delete all remaining subjects to start fresh
    await prisma.subject.deleteMany({});

    // Create categories and their subcategories
    for (const [categoryName, subcategories] of Object.entries(subjectCategories)) {
      console.log(`Creating category: ${categoryName}`);
      
      // Create the category
      const category = await prisma.subject.create({
        data: {
          name: categoryName,
          parentId: null,
        },
      });

      console.log(`  Created category with ID: ${category.id}`);

      // Create subcategories
      for (const subcategoryName of subcategories) {
        try {
          const capitalizedName = capitalizeFirstLetter(subcategoryName);
          await prisma.subject.create({
            data: {
              name: capitalizedName,
              parentId: category.id,
            },
          });
          console.log(`    ✓ Created subcategory: ${capitalizedName}`);
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`    ⚠ Subcategory already exists: ${subcategoryName}`);
          } else {
            console.error(`    ✗ Error creating subcategory ${subcategoryName}:`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Subject seeding completed successfully!');
    
    // Count results
    const categoryCount = await prisma.subject.count({
      where: { parentId: null },
    });
    const subcategoryCount = await prisma.subject.count({
      where: { parentId: { not: null } },
    });
    
    console.log(`\nSummary:`);
    console.log(`  Categories: ${categoryCount}`);
    console.log(`  Subcategories: ${subcategoryCount}`);
    console.log(`  Total: ${categoryCount + subcategoryCount}`);
  } catch (error) {
    console.error('Error seeding subjects:', error);
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

