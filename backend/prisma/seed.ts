// E:\coding\jTutors\JTUTORS\backend\prisma\seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// --- 1. DEFINE THE NEW DATA STRUCTURE ---
// Note: Duplicate subjects (Literacy, Cosmetology) have been removed from the list to fix the P2002 error.
const subjectsHierarchy = {
    'Standardized Tests': [
        'ACT', 'ACT English', 'ACT Math', 'ACT Reading', 'ACT Science', 'DAT', 'GED', 'GMAT',
        'GRE', 'IELTS', 'LSAT', 'MCAT', 'PCAT', 'PSAT', 'SAT', 'SAT Math', 'SAT Reading',
        'SAT Writing', 'Series 3', 'Series 6', 'Series 7', 'Series 63', 'Series 65',
        'Series 66', 'TOEFL'
    ],
    'Mathematics': [
        'Actuarial Science', 'Algebra 1', 'Algebra 2', 'Calculus', 'Discrete Math',
        'Econometrics', 'Elementary Math', 'Geometry', 'Linear Algebra', 'Logic',
        'Precalculus', 'Prealgebra', 'Probability', 'Quantum Physics', 'Statistics',
        'Trigonometry'
    ],
    'Science': [
        'Anatomy', 'Astronomy', 'Biochemistry', 'Biology', 'Biostatistics', 'Botany',
        'Chemical Engineering', 'Chemistry', 'Civil Engineering', 'Ecology', 'Earth Science',
        'Environmental Science', 'Epidemiology', 'Genetics', 'Geology', 'Mechanical Engineering',
        'Microbiology', 'Neuroscience', 'Nursing', 'Nutrition', 'Organic Chemistry',
        'Pharmacology', 'Physical Science', 'Physics', 'Physiology', 'Zoology'
    ],
    'Computer Science / Technology': [
        'AWS', 'COBOL', 'Common Core', 'Computer Engineering', 'Computer Gaming (Game Design)',
        'Computer Programming', 'Computer Science', 'Cybersecurity', 'Data Analysis',
        'Data Science', 'Data Structures', 'DOS', 'Dreamweaver', 'General Computer', 'GIS',
        'HTML', 'Information Technology', 'Java', 'Javascript', 'JQuery', 'Linux', 'Macintosh',
        'Machine Learning/AI', 'Mathematica', 'MATLAB', 'Microsoft 365', 'Microsoft Access',
        'Microsoft Excel', 'Microsoft Outlook', 'Microsoft PowerPoint', 'Microsoft Publisher',
        'Microsoft Windows', 'Microsoft Word', 'Networking (Computer)', 'Oracle', 'Pascal',
        'Perl', 'Python', 'QuickBooks', 'R', 'React', 'Revit', 'Robotics', 'Ruby',
        'Sketchup', 'Solidworks', 'SPSS', 'SQL', 'STATA', 'Swift', 'Tableau', 'Unity',
        'UNIX', 'Unreal Engine', 'Visual Basic', 'Web Design'
    ],
    'Languages': [
        'Accent Reduction', 'Braille', 'Bulgarian', 'Czech', 'Dutch', 'ESL/ESOL', 'Farsi',
        'French', 'German', 'Greek', 'Hebrew', 'Hebrew Language', 'Hindi', 'Hungarian',
        'Indonesian', 'Italian', 'Korean', 'Latin', 'Polish', 'Portuguese', 'Romanian',
        'Russian', 'Sign Language', 'Spanish', 'Thai', 'Turkish', 'Urdu'
    ],
    'History / Social Studies': [
        'African American Studies', 'American History', 'Anthropology', 'Archaeology',
        'Classics', 'Criminology / Criminal Justice', 'Debate', 'Economics',
        'European History', 'Government and Politics', 'History of Israel', 'Holocaust Studies',
        'Jewish History', 'Political Science', 'Religion', 'Social Studies', 'Social Work',
        'Sociology', 'United States History', 'World History', 'Zionism'
    ],
    'Business / Law': [
        'Business', 'Career Development', 'Entrepreneurship', 'Finance', 'Financial Accounting',
        'Interview Prep', 'Law', 'Legal Writing', 'Macroeconomics', 'Managerial Accounting',
        'Marketing', 'MBA', 'Project Management', 'Real Estate', 'Sports Management',
        'Sports Medicine', 'Tax Accounting'
    ],
    'Jewish Studies': [
        'Bar Mitzvah', 'Chassidus', 'Chumash', 'Conversational Hebrew', 'Halacha',
        'Hebrew Language', 'Jewish Law', 'Jewish Philosophy', 'Kriyah', 'Leining',
        'Mussar', 'Navih', 'Talmud', 'Tanach', 'Tefillah', 'Torah Reading'
    ],
    'English / Literature / Writing': [
        'American Literature', 'British Literature', 'Composition', 'Creative Writing',
        'English', 'Essay Writing', 'Fiction Writing', 'Grammar', 'Linguistics', // Removed Literacy
        'Proofreading', 'Reading', 'Spelling', 'Vocabulary', 'Writing'
    ],
    'Music / Art': [
        'Adobe After Effects', 'Adobe Flash', 'Adobe Illustrator', 'Adobe InDesign',
        'Adobe Lightroom', 'Adobe Photoshop', 'Adobe Premier', 'Art History', 'Art Theory',
        'Composition (Music)', 'Cosmetology', // Kept Cosmetology here
        'Drawing', 'Drums', 'Ear Training', 'Film',
        'Flute', 'French Horn', 'General Music', 'Graphic Design', 'Guitar', 'Music History',
        'Music Production', 'Music Theory', 'Painting', 'Photography', 'Piano', 'Saxophone',
        'Sight Singing', 'Songwriting', 'Theatres', 'Video Production', 'Violin', 'Voice (Music)'
    ],
    'Other / Skills': [
        'Architecture', 'Handwriting', 'Homeschool', // Removed Literacy, Cosmetology
        'Study Skills', 'Public Speaking', 'Speech'
    ]
};

async function main() {
    console.log('--- STARTING SUBJECT RESEEDING PROCESS ---');

    // --- STEP 1: CLEANUP (Deletes all existing subjects) ---
    console.log('1. Deleting all existing Subject records...');
    const deleteResult = await prisma.subject.deleteMany({});
    console.log(`✅ Cleaned up ${deleteResult.count} previous subject records.`);

    // --- STEP 2: CREATE CATEGORIES ---
    const categoriesMap = new Map<string, string>();
    const categoryNames = Object.keys(subjectsHierarchy);

    console.log('2. Creating main subject categories...');
    for (const name of categoryNames) {
        const category = await prisma.subject.create({
            data: {
                name: name,
                parentId: null // Top-level categories have no parent
            },
        });
        categoriesMap.set(name, category.id);
        console.log(`- Created category: ${category.name}`);
    }

    // --- STEP 3: CREATE SUB-SUBJECTS ---
    console.log('3. Creating sub-subjects and linking them to categories...');
    for (const categoryName of categoryNames) {
        const parentId = categoriesMap.get(categoryName);
        const subSubjects = subjectsHierarchy[categoryName];

        if (parentId) {
            for (const subName of subSubjects) {
                const subject = await prisma.subject.create({
                    data: {
                        name: subName,
                        parentId: parentId, // Link to the parent category's ID
                    },
                });
                // console.log(`  - Created subject: ${subject.name}`);
            }
            console.log(`✅ Added ${subSubjects.length} subjects to ${categoryName}.`);
        } else {
            console.error(`ERROR: Could not find parent ID for category: ${categoryName}`);
        }
    }

    console.log('--- SUBJECT RESEEDING FINISHED. ---')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })