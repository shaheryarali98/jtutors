export const K12_GRADE_BANDS = ['Elementary School', 'Middle School', 'High School'] as const;

/** Grades You Can Teach (tutor profile) / Browse Tutors grade filter */
export const TUTOR_GRADE_OPTIONS = [...K12_GRADE_BANDS, 'College', 'Graduate School', 'Adult Education'];

/** Tutor request board grade filter/picker */
export const REQUEST_GRADE_OPTIONS = [...K12_GRADE_BANDS, 'College', 'Adult'];
