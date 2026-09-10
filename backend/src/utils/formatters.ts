type MaybeStoredArray = string | string[] | null | undefined;

const parseStringArray = (value: MaybeStoredArray): string[] => {
  if (Array.isArray(value)) {
    return value as string[];
  }

  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

type FormattableAvailability = {
  daysAvailable?: MaybeStoredArray;
  [key: string]: unknown;
};

type FormattableTutor = {
  gradesCanTeach?: MaybeStoredArray;
  languagesSpoken?: MaybeStoredArray;
  availabilities?: FormattableAvailability[];
  subjects?: Array<{
    displayOrder?: number;
    createdAt?: Date | string;
    subject?: { name?: string };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

type FormattableStudent = {
  languagesSpoken?: MaybeStoredArray;
  learningPreferences?: MaybeStoredArray;
  [key: string]: unknown;
};

export const formatTutor = (tutor: FormattableTutor | null) => {
  if (!tutor) return tutor;

  return {
    ...tutor,
    gradesCanTeach: parseStringArray(tutor.gradesCanTeach),
    languagesSpoken: parseStringArray(tutor.languagesSpoken),
    subjects: tutor.subjects
      ? [...tutor.subjects].sort((a, b) => {
          const orderDifference = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
          if (orderDifference !== 0) return orderDifference;

          const createdDifference =
            new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
          if (createdDifference !== 0) return createdDifference;

          return (a.subject?.name ?? '').localeCompare(b.subject?.name ?? '');
        })
      : tutor.subjects,
    availabilities: tutor.availabilities
      ? tutor.availabilities.map((availability) => ({
          ...availability,
          daysAvailable: parseStringArray(availability.daysAvailable),
        }))
      : tutor.availabilities,
  };
};

export const formatTutorArray = (tutors: FormattableTutor[]) =>
  tutors.map((tutor) => formatTutor(tutor) as FormattableTutor);

export const formatStudent = (student: FormattableStudent | null) => {
  if (!student) return student;

  return {
    ...student,
    languagesSpoken: parseStringArray(student.languagesSpoken),
    learningPreferences: parseStringArray(student.learningPreferences),
  };
};

export const stringifyArray = (value: unknown): string | undefined => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return JSON.stringify([]);
};

export const parseStoredArray = (value: MaybeStoredArray): string[] => parseStringArray(value);

