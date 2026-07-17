/**
 * Backfill legacy per-grade / range values into the three grade bands:
 * Grades 1-5 -> Elementary School, 6-8 -> Middle School, 9-12 -> High School.
 * Non-K12 values (College, Graduate School, Adult Education, Adult...) are left untouched.
 * Idempotent — safe to run repeatedly (already-banded values pass through unchanged),
 * and wired into `start:migrate` so it self-heals production on next deploy.
 * Run manually: node scripts/migrate-grade-bands.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const GRADE_BANDS = ['Elementary School', 'Middle School', 'High School'];

const gradeToken = (value) => value.replace(/\s+/g, '').toLowerCase();

const toGradeNumber = (token) => {
  if (token === 'k' || token === 'kindergarten') return 0;
  const m = token.match(/^(?:grade)?(\d+)$/);
  return m ? Number(m[1]) : null;
};

const bandForNumber = (n) => {
  if (n >= 1 && n <= 5) return 'Elementary School';
  if (n >= 6 && n <= 8) return 'Middle School';
  if (n >= 9 && n <= 12) return 'High School';
  return null;
};

function normalizeGrade(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return trimmed;
  if (GRADE_BANDS.includes(trimmed)) return trimmed;

  const token = gradeToken(trimmed);

  const single = toGradeNumber(token);
  if (single !== null) {
    const band = bandForNumber(single);
    if (band) return band;
  }

  const rangeMatch = token.match(/^(k|\d+)-(\d+)$/i);
  if (rangeMatch) {
    const band = bandForNumber(Number(rangeMatch[2]));
    if (band) return band;
  }

  return trimmed;
}

function parseStoredArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // not JSON — fall through to comma-split below
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function migrateStudents() {
  const students = await prisma.student.findMany({ where: { grade: { not: null } } });
  let changed = 0;
  for (const s of students) {
    const next = normalizeGrade(s.grade);
    if (next !== s.grade) {
      await prisma.student.update({ where: { id: s.id }, data: { grade: next } });
      changed++;
    }
  }
  console.log(`Students: ${changed}/${students.length} updated`);
}

async function migrateTutors() {
  const tutors = await prisma.tutor.findMany({ where: { gradesCanTeach: { not: null } } });
  let changed = 0;
  for (const t of tutors) {
    const original = parseStoredArray(t.gradesCanTeach);
    if (!original.length) continue;
    const seen = new Set();
    const normalized = [];
    for (const g of original) {
      const n = normalizeGrade(g);
      if (!seen.has(n)) {
        seen.add(n);
        normalized.push(n);
      }
    }
    const nextValue = JSON.stringify(normalized);
    if (nextValue !== t.gradesCanTeach) {
      await prisma.tutor.update({ where: { id: t.id }, data: { gradesCanTeach: nextValue } });
      changed++;
    }
  }
  console.log(`Tutors: ${changed}/${tutors.length} updated`);
}

async function migrateTutorRequests() {
  const requests = await prisma.tutorRequest.findMany({ where: { grade: { not: null } } });
  let changed = 0;
  for (const r of requests) {
    const next = normalizeGrade(r.grade);
    if (next !== r.grade) {
      await prisma.tutorRequest.update({ where: { id: r.id }, data: { grade: next } });
      changed++;
    }
  }
  console.log(`TutorRequests: ${changed}/${requests.length} updated`);
}

async function main() {
  console.log('Migrating grade values to Elementary School / Middle School / High School bands...');
  await migrateStudents();
  await migrateTutors();
  await migrateTutorRequests();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('grade band migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
