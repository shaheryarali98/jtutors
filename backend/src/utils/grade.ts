/**
 * Grades 1-5 -> Elementary School, 6-8 -> Middle School, 9-12 -> High School.
 * Non-K12 values (College, Graduate School, Adult Education, Adult...) pass through unchanged.
 * Collapses legacy formats too ("Grade 5", "5", "K-5", "6-8", "9-12" ranges) so old stored
 * data and new band-based data compare equal without a hard schema migration.
 */
export const GRADE_BANDS = ['Elementary School', 'Middle School', 'High School'] as const;
export type GradeBand = (typeof GRADE_BANDS)[number];

const gradeToken = (value: string) => value.replace(/\s+/g, '').toLowerCase();

const toGradeNumber = (token: string): number | null => {
  if (token === 'k' || token === 'kindergarten') return 0;
  const m = token.match(/^(?:grade)?(\d+)$/);
  return m ? Number(m[1]) : null;
};

const bandForNumber = (n: number): GradeBand | null => {
  if (n >= 1 && n <= 5) return 'Elementary School';
  if (n >= 6 && n <= 8) return 'Middle School';
  if (n >= 9 && n <= 12) return 'High School';
  return null;
};

export const normalizeGrade = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if ((GRADE_BANDS as readonly string[]).includes(trimmed)) return trimmed;

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
};

export const gradeMatches = (storedGrade: string, requestedGrade: string): boolean => {
  if (!storedGrade || !requestedGrade) return false;
  return normalizeGrade(storedGrade).toLowerCase() === normalizeGrade(requestedGrade).toLowerCase();
};
