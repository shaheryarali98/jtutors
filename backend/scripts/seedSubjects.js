const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
    'PSAT',
    'SAT',
    'SAT Math',
    'SAT Reading',
    'SAT Writing',
    'Series 3',
    'Series 6',
    'Series 7',
    'Series 63',
    'Series 65',
    'Series 66',
    'TOEFL',
  ],
  'Mathematics': [
    'actuarial science',
    'algebra 1',
    'algebra 2',
    'calculus',
    'discrete math',
    'econometrics',
    'elementary math',
    'geometry',
    'linear algebra',
    'logic',
    'precalculus',
    'prealgebra',
    'probability',
    'quantum physics',
    'statistics',
    'trigonometry',
  ],
  'Science': [
    'anatomy',
    'astronomy',
    'biochemistry',
    'biology',
    'biostatistics',
    'botany',
    'chemical engineering',
    'chemistry',
    'civil engineering',
    'ecology',
    'earth science',
    'environmental science',
    'epidemiology',
    'genetics',
    'geology',
    'mechanical engineering',
    'microbiology',
    'neuroscience',
    'nursing',
    'nutrition',
    'organic chemistry',
    'pharmacology',
    'physical science',
    'physics',
    'physiology',
    'zoology',
  ],
  'Computer Science / Technology': [
    'AWS',
    'COBOL',
    'Common Core',
    'computer engineering',
    'computer gaming (game design)',
    'computer programming',
    'computer science',
    'cybersecurity',
    'data analysis',
    'data science',
    'data structures',
    'DOS',
    'Dreamweaver',
    'general computer',
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
    'networking (computer)',
    'Oracle',
    'Pascal',
    'Perl',
    'Python',
    'QuickBooks',
    'R',
    'React',
    'Revit',
    'robotics',
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
    'web design',
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
    'sign language',
    'Spanish',
    'Thai',
    'Turkish',
    'Urdu',
  ],
  'History / Social Studies': [
    'African American Studies',
    'American history',
    'anthropology',
    'archaeology',
    'classics',
    'criminology / criminal justice',
    'debate',
    'economics',
    'European history',
    'government and politics',
    'history of Israel',
    'holocaust studies',
    'Jewish history',
    'political science',
    'religion',
    'social studies',
    'social work',
    'sociology',
    'United States history',
    'world history',
    'Zionism',
  ],
  'Business / Law': [
    'business',
    'career development',
    'entrepreneurship',
    'finance',
    'financial accounting',
    'interview prep',
    'law',
    'legal writing',
    'macroeconomics',
    'managerial accounting',
    'marketing',
    'MBA',
    'project management',
    'real estate',
    'sports management',
    'sports medicine',
    'tax accounting',
  ],
  'Jewish Studies': [
    'Bar Mitzvah',
    'Chumash',
    'Halacha',
    'Jewish law',
    'Jewish philosophy',
    'leining',
    'Navih',
    'Talmud',
    'Tanach',
    'Torah reading',
  ],
  'English / Literature / Writing': [
    'American literature',
    'British literature',
    'creative writing',
    'English',
    'essay writing',
    'fiction writing',
    'grammar',
    'literacy',
    'linguistics',
    'proofreading',
    'reading',
    'spelling',
    'vocabulary',
    'writing',
  ],
  'Music / Art': [
    'Adobe After Effects',
    'Adobe Flash',
    'Adobe Illustrator',
    'Adobe InDesign',
    'Adobe Lightroom',
    'Adobe Photoshop',
    'Adobe Premier',
    'art history',
    'art theory',
    'composition (music)',
    'cosmetology',
    'drawing',
    'drums',
    'ear training',
    'film',
    'flute',
    'French horn',
    'general music',
    'graphic design',
    'guitar',
    'music history',
    'music production',
    'music theory',
    'painting',
    'photography',
    'piano',
    'saxophone',
    'sight singing',
    'songwriting',
    'theatre',
    'video production',
    'violin',
    'voice (music)',
  ],
  'Other / Skills': [
    'architecture',
    'cosmetology',
    'handwriting',
    'homeschool',
    'literacy',
    'study skills',
    'public speaking',
    'speech',
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
          await prisma.subject.create({
            data: {
              name: subcategoryName,
              parentId: category.id,
            },
          });
          console.log(`    ✓ Created subcategory: ${subcategoryName}`);
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

