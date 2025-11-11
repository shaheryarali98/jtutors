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
  [key: string]: unknown;
};

export const formatTutor = (tutor: FormattableTutor | null) => {
  if (!tutor) return tutor;

  return {
    ...tutor,
    gradesCanTeach: parseStringArray(tutor.gradesCanTeach),
    languagesSpoken: parseStringArray(tutor.languagesSpoken),
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

export const stringifyArray = (value: unknown): string | undefined => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return JSON.stringify([]);
};

export const parseStoredArray = (value: MaybeStoredArray): string[] => parseStringArray(value);

