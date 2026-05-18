import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { formatStudent, formatTutor, formatTutorArray, parseStoredArray } from '../utils/formatters';
import { getAdminSettings } from '../services/settings.service';
import { sendEmail } from '../services/email.service';
import { sendTemplatedEmail } from '../services/emailTemplate.service';

const prisma = new PrismaClient();

type AvailabilityWindow = {
  daysAvailable?: string | string[] | null;
  startTime?: string | null;
  endTime?: string | null;
  breakTime?: number | null;
  sessionDuration?: number | null;
  numberOfSlots?: number | null;
};

const isValidTimeZone = (value?: string | null) => {
  if (!value) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const getSafeTimeZone = (value?: string | null) => (isValidTimeZone(value) ? value! : 'UTC');

const parseTimeToMinutes = (value?: string | null) => {
  if (!value) return null;
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
};

const getZonedDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    weekday: lookup('weekday'),
    year: Number(lookup('year')),
    month: Number(lookup('month')),
    day: Number(lookup('day')),
    hour: Number(lookup('hour')) % 24,
    minute: Number(lookup('minute')),
  };
};

const matchesAvailabilityBlock = (
  availability: AvailabilityWindow,
  start: Date,
  end: Date,
  timeZone: string
) => {
  const slotStart = getZonedDateParts(start, timeZone);
  const slotEnd = getZonedDateParts(end, timeZone);
  const daysAvailable = parseStoredArray(availability.daysAvailable);
  const blockStart = parseTimeToMinutes(availability.startTime);
  const blockEnd = parseTimeToMinutes(availability.endTime);
  const sessionDuration = Number(availability.sessionDuration ?? 0);
  const breakTime = Math.max(0, Number(availability.breakTime ?? 0));

  if (
    !daysAvailable.includes(slotStart.weekday) ||
    blockStart === null ||
    blockEnd === null ||
    sessionDuration <= 0
  ) {
    return false;
  }

  if (
    slotStart.year !== slotEnd.year ||
    slotStart.month !== slotEnd.month ||
    slotStart.day !== slotEnd.day
  ) {
    return false;
  }

  const slotStartMinutes = slotStart.hour * 60 + slotStart.minute;
  const slotEndMinutes = slotEnd.hour * 60 + slotEnd.minute;

  if (slotEndMinutes <= slotStartMinutes) {
    return false;
  }

  if (slotEndMinutes - slotStartMinutes !== sessionDuration) {
    return false;
  }

  if (slotStartMinutes < blockStart || slotEndMinutes > blockEnd) {
    return false;
  }

  const slotInterval = sessionDuration + breakTime;
  if (slotInterval <= 0) {
    return false;
  }

  return (slotStartMinutes - blockStart) % slotInterval === 0;
};

const bookingMatchesAvailability = (
  availabilities: AvailabilityWindow[],
  start: Date,
  end: Date,
  timeZone: string
) => availabilities.some((availability) => matchesAvailabilityBlock(availability, start, end, timeZone));

// Convert a local calendar date + minutes-from-midnight to a UTC Date in a given timezone.
const localToUtc = (
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
  timeZone: string
): Date => {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  // Treat the local time as UTC as a first approximation
  const roughUtc = new Date(Date.UTC(year, month - 1, day, h, m));
  // Find what local time that UTC instant maps to in the target timezone
  const localParts = getZonedDateParts(roughUtc, timeZone);
  const localMinutes = localParts.hour * 60 + localParts.minute;
  // Shift by the difference so the result reads as the intended local time
  return new Date(roughUtc.getTime() + (minutesFromMidnight - localMinutes) * 60_000);
};

const generateBookableSlots = (
  availabilities: AvailabilityWindow[],
  existingBookings: Array<{ startTime: Date; endTime: Date }>,
  tutorTimeZone: string
) => {
  const now = new Date();
  const horizonDays = 14; // look 2 weeks ahead
  const safeZone = getSafeTimeZone(tutorTimeZone);
  const slots: Array<{ start: string; end: string }> = [];

  for (const availability of availabilities) {
    const sessionDuration = Number(availability.sessionDuration ?? 0);
    const breakTime = Math.max(0, Number(availability.breakTime ?? 0));
    const numberOfSlots = Math.max(1, Number(availability.numberOfSlots ?? 1));
    const daysAvailable = parseStoredArray(availability.daysAvailable);
    const blockStart = parseTimeToMinutes(availability.startTime);
    const blockEnd = parseTimeToMinutes(availability.endTime);

    if (sessionDuration <= 0 || blockStart === null || blockEnd === null || daysAvailable.length === 0) {
      continue;
    }

    const slotInterval = sessionDuration + breakTime;
    if (slotInterval <= 0) continue;

    // Iterate day by day over the horizon
    for (let dayOffset = 0; dayOffset <= horizonDays; dayOffset++) {
      const probe = new Date(now.getTime() + dayOffset * 24 * 60 * 60_000);
      const dateParts = getZonedDateParts(probe, safeZone);

      if (!daysAvailable.includes(dateParts.weekday)) continue;

      // Walk through each discrete slot in this availability window
      let slotStartMinutes = blockStart;
      while (slotStartMinutes + sessionDuration <= blockEnd) {
        const slotStart = localToUtc(dateParts.year, dateParts.month, dateParts.day, slotStartMinutes, safeZone);
        const slotEnd = new Date(slotStart.getTime() + sessionDuration * 60_000);

        // Must be at least 5 minutes in the future
        if (slotStart.getTime() > now.getTime() + 5 * 60_000) {
          const overlapCount = existingBookings.filter(
            (b) => slotStart < b.endTime && slotEnd > b.startTime
          ).length;

          if (overlapCount < numberOfSlots) {
            slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
          }
        }

        slotStartMinutes += slotInterval;
      }
    }
  }

  return slots
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 30);
};

const sanitizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const calculateProfileCompletion = (payload: {
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  gender?: string | null;
  grade?: string | null;
  tagline?: string | null;
  bio?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  timezone?: string | null;
  address?: string | null;
  zipcode?: string | null;
  languages: string[];
  learningPreferences: string[];
  introduction?: string | null;
}) => {
  return Boolean(
    payload.firstName &&
    payload.lastName &&
    payload.gender &&
    payload.grade &&
    payload.bio &&
    payload.country &&
    payload.city &&
    payload.timezone &&
    payload.zipcode &&
    payload.languages.length > 0 &&
    payload.learningPreferences.length > 0
  );
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({ student: formatStudent(student as any) });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ error: 'Error fetching student profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      firstName,
      lastName,
      profileImage,
      gender,
      grade,
      tagline,
      bio,
      country,
      state,
      city,
      timezone,
      address,
      zipcode,
      languagesSpoken,
      learningLocationPreferences,
      introduction,
    } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const languageArray = sanitizeStringArray(languagesSpoken);
    const learningPreferenceArray = sanitizeStringArray(learningLocationPreferences);

    if (timezone && !isValidTimeZone(timezone)) {
      return res.status(400).json({ error: 'Please select a valid timezone.' });
    }

    const nowCompleted = calculateProfileCompletion({
      firstName,
      lastName,
      profileImage,
      gender,
      grade,
      tagline,
      bio,
      country,
      state,
      city,
      timezone,
      address,
      zipcode,
      languages: languageArray,
      learningPreferences: learningPreferenceArray,
      introduction,
    });

    console.log('📝 Student profile update:', {
      userId,
      firstName,
      lastName,
      gender,
      grade,
      country,
      city,
      timezone,
      zipcode,
      languagesCount: languageArray.length,
      preferencesCount: learningPreferenceArray.length,
      bioLength: bio?.length || 0,
      nowCompleted,
    });

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        firstName,
        lastName,
        profileImage,
        gender,
        grade,
        tagline,
        bio,
        country,
        state,
        city,
        timezone,
        address,
        zipcode,
        languagesSpoken: languageArray.length ? JSON.stringify(languageArray) : null,
        learningPreferences: learningPreferenceArray.length ? JSON.stringify(learningPreferenceArray) : null,
        introduction,
        profileCompleted: nowCompleted,
      },
      include: {
        user: true,
      },
    });

    if (nowCompleted && !student.profileCompleted) {
      const settings = await getAdminSettings();
      if (settings.sendProfileCompletionEmail) {
        sendEmail({
          to: student.user.email,
          subject: 'JTutors Profile Complete',
          html: `
            <h2>Great work!</h2>
            <p>Your JTutors learner profile is now complete.</p>
            <p>You're all set to start booking sessions with tutors.</p>
            <p>Best of luck,<br/>The JTutors Team</p>
          `,
          text: `Your JTutors learner profile is now complete. You're all set!`,
        }).catch((error) => console.error('Failed to send student profile completion email:', error));
      }
    }

    res.json({
      message: 'Profile updated successfully',
      student: formatStudent(updatedStudent as any),
      profileCompleted: nowCompleted,
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

export const searchTutors = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { subject, minFee, maxFee, grade, location } = req.query;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        savedTutors: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const savedTutorIds = new Set(student.savedTutors.map((saved) => saved.tutorId));

    const tutors = await prisma.tutor.findMany({
      where: {
        backgroundCheck: {
          status: 'APPROVED',
        },
        user: {
          emailConfirmed: true,
        },
        ...(minFee && { hourlyFee: { gte: parseFloat(minFee as string) } }),
        ...(maxFee && { hourlyFee: { lte: parseFloat(maxFee as string) } }),
        ...(grade && { gradesCanTeach: { contains: `"${grade}"` } }),
        ...(location && {
          OR: [
            { city: { contains: location as string } },
            { state: { contains: location as string } },
            { country: { contains: location as string } },
          ],
        }),
        ...(subject && {
          subjects: {
            some: {
              subject: {
                name: subject as string,
              },
            },
          },
        }),
      },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
        experiences: true,
        educations: true,
        availabilities: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedTutors = formatTutorArray(tutors as any).map((tutor: any) => ({
      ...tutor,
      saved: savedTutorIds.has(tutor.id as string),
    }));

    res.json({ tutors: formattedTutors });
  } catch (error) {
    console.error('Search tutors error:', error);
    res.status(500).json({ error: 'Error searching tutors' });
  }
};

export const getTutorDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tutorId } = req.params;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        savedTutors: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
        experiences: true,
        educations: true,
        availabilities: true,
      },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    const saved = student.savedTutors.some((savedTutor) => savedTutor.tutorId === tutor.id);

    // Fetch existing (non-cancelled) bookings for this tutor so the frontend can filter slots
    const existingBookings = await prisma.booking.findMany({
      where: {
        tutorId: tutor.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { startTime: true, endTime: true },
    });

    const tutorTimeZone = getSafeTimeZone((tutor as any).timezone);
    const bookableSlots = generateBookableSlots(
      (tutor.availabilities as AvailabilityWindow[]) ?? [],
      existingBookings,
      tutorTimeZone
    );

    res.json({
      tutor: {
        ...formatTutor(tutor as any),
        saved,
        existingBookings,
        bookableSlots,
      },
    });
  } catch (error) {
    console.error('Get tutor details error:', error);
    res.status(500).json({ error: 'Error fetching tutor details' });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tutorId, startTime, endTime } = req.body;

    if (!tutorId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Tutor, start time, and end time are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end time' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // if (!student.profileCompleted) {
    //   return res.status(400).json({ error: 'Complete your profile before booking a tutor' });
    // }

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      include: {
        availabilities: true,
      },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    if (!tutor.availabilities.length) {
      return res.status(400).json({ error: 'This tutor has not opened any bookable time slots yet.' });
    }

    const tutorTimeZone = getSafeTimeZone(tutor.timezone);
    const matchesAvailability = bookingMatchesAvailability(tutor.availabilities, start, end, tutorTimeZone);
    if (!matchesAvailability) {
      return res.status(400).json({
        error: 'The selected slot is no longer available. Please choose another available time.',
      });
    }

    // Overlap guard: reject if a PENDING/CONFIRMED booking already covers this window
    const overlap = await prisma.booking.findFirst({
      where: {
        tutorId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (overlap) {
      return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
    }

    const booking = await prisma.booking.create({
      data: {
        studentId: student.id,
        tutorId,
        startTime: start,
        endTime: end,
        status: 'PENDING',
      },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    // Automatically create Google Classroom for the booking
    try {
      const { ensureGoogleClassroomForBooking } = await import('../services/classSession.service');
      await ensureGoogleClassroomForBooking(booking.id, `Class with ${tutor.firstName || 'Tutor'}`);
    } catch (error) {
      console.error('Error creating Google Classroom for booking:', error);
      // Don't fail the booking creation if Google Classroom fails
    }

    // Notify tutor about the new booking
    try {
      const tutorEmail = booking.tutor.user.email;
      const studentEmail = booking.student.user.email;
      const studentName = [booking.student.firstName, booking.student.lastName].filter(Boolean).join(' ') || studentEmail;
      await sendTemplatedEmail('SESSION_BOOKED_TUTOR', tutorEmail, {
        tutorName: tutor.firstName || tutorEmail,
        studentName,
        studentEmail,
        startTime: start.toLocaleString(),
        endTime: end.toLocaleString(),
      });
    } catch (emailError) {
      console.error('Error sending booking notification to tutor:', emailError);
      // Don't fail booking creation if email fails
    }

    res.status(201).json({
      message: 'Booking created successfully. Google Classroom will be set up automatically.',
      booking,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Error creating booking' });
  }
};

export const getMyBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const bookings = await prisma.booking.findMany({
      where: { studentId: student.id },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
            subjects: {
              include: {
                subject: true,
              },
            },
          },
        },
        classSession: true,
        payment: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    const enrichedBookings = bookings.map((booking) => {
      const durationHours = Math.max(0, (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60));
      return {
        ...booking,
        durationHours: Number(durationHours.toFixed(2)),
      };
    });

    res.json({ bookings: enrichedBookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
};

export const getSavedInstructors = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const savedTutors = await prisma.studentSavedTutor.findMany({
      where: { studentId: student.id },
      include: {
        tutor: {
          include: {
            subjects: {
              include: {
                subject: true,
              },
            },
            experiences: true,
            educations: true,
            availabilities: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      savedTutors: savedTutors.map((entry) => ({
        id: entry.id,
        tutorId: entry.tutorId,
        savedAt: entry.createdAt,
        tutor: formatTutor(entry.tutor as any),
      })),
    });
  } catch (error) {
    console.error('Get saved instructors error:', error);
    res.status(500).json({ error: 'Error fetching saved instructors' });
  }
};

export const addSavedInstructor = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tutorId } = req.body;

    if (!tutorId) {
      return res.status(400).json({ error: 'Tutor ID is required' });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    const saved = await prisma.studentSavedTutor.upsert({
      where: {
        studentId_tutorId: {
          studentId: student.id,
          tutorId,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        tutorId,
      },
      include: {
        tutor: {
          include: {
            subjects: {
              include: {
                subject: true,
              },
            },
            experiences: true,
            educations: true,
            availabilities: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Instructor saved successfully',
      savedTutor: {
        id: saved.id,
        tutorId: saved.tutorId,
        savedAt: saved.createdAt,
        tutor: formatTutor(saved.tutor as any),
      },
    });
  } catch (error) {
    console.error('Add saved instructor error:', error);
    res.status(500).json({ error: 'Error saving instructor' });
  }
};

export const removeSavedInstructor = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tutorId } = req.params;

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    await prisma.studentSavedTutor.delete({
      where: {
        studentId_tutorId: {
          studentId: student.id,
          tutorId,
        },
      },
    }).catch(() => { });

    res.json({ message: 'Instructor removed from saved list' });
  } catch (error) {
    console.error('Remove saved instructor error:', error);
    res.status(500).json({ error: 'Error removing saved instructor' });
  }
};

export const getTutoringHourLog = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const bookings = await prisma.booking.findMany({
      where: { studentId: student.id },
      include: {
        classSession: true,
      },
    });

    let totalHours = 0;
    let approvedHours = 0;

    bookings.forEach((booking) => {
      const duration = Math.max(0, (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60));
      totalHours += duration;

      if (booking.classSession?.adminApproved) {
        approvedHours += duration;
      }
    });

    const pendingOrDeclinedHours = Math.max(0, totalHours - approvedHours);

    res.json({
      totalHours: Number(totalHours.toFixed(2)),
      approvedHours: Number(approvedHours.toFixed(2)),
      pendingOrDeclinedHours: Number(pendingOrDeclinedHours.toFixed(2)),
    });
  } catch (error) {
    console.error('Get tutoring hour log error:', error);
    res.status(500).json({ error: 'Error calculating tutoring hours' });
  }
};

export const acceptTerms = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      },
    });

    res.json({ message: 'Terms and conditions accepted successfully' });
  } catch (error) {
    console.error('Accept terms error:', error);
    res.status(500).json({ error: 'Error accepting terms and conditions' });
  }
};

export const cancelBookingStudent = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const booking = await prisma.booking.findFirst({
      where: { id, studentId: student.id },
      include: { payment: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Only PENDING or CONFIRMED bookings can be cancelled.' });
    }

    const devBypass = process.env.DEV_BYPASS_STRIPE === 'true';

    // Refund if payment was made
    if (booking.payment && booking.payment.paymentStatus === 'PAID') {
      if (!devBypass && booking.payment.stripePaymentIntentId) {
        const { stripe } = await import('../services/stripe.service');
        await stripe!.refunds.create({ payment_intent: booking.payment.stripePaymentIntentId });
      }
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: { paymentStatus: 'REFUNDED' },
      });
    }

    await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });

    res.json({ message: 'Booking cancelled successfully.' + (booking.payment?.paymentStatus === 'PAID' ? ' A refund has been issued.' : '') });
  } catch (error) {
    console.error('Cancel booking (student) error:', error);
    res.status(500).json({ error: 'Error cancelling booking' });
  }
};

export const getStudentPaymentMethods = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const stripeCustomerId = (student as any).stripeCustomerId as string | null;
    if (!stripeCustomerId) return res.json({ paymentMethods: [] });

    const { stripe } = await import('../services/stripe.service');
    if (!stripe) return res.json({ paymentMethods: [] });
    const pms = await stripe!.paymentMethods.list({ customer: stripeCustomerId, type: 'card' });

    const cards = pms.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));

    res.json({ paymentMethods: cards });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Error fetching payment methods' });
  }
};

// Create a Stripe SetupIntent so students can save a card
export const createSetupIntent = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const { stripe } = await import('../services/stripe.service');
    if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    let stripeCustomerId = (student as any).stripeCustomerId as string | null;

    // Create a Stripe customer if the student doesn't have one yet
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { studentId: student.id, userId },
      });
      stripeCustomerId = customer.id;
      await prisma.$executeRawUnsafe(
        `UPDATE "Student" SET "stripeCustomerId" = $1 WHERE "id" = $2`,
        stripeCustomerId,
        student.id
      );
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ error: 'Error creating setup intent' });
  }
};

// Remove a saved payment method
export const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const { stripe } = await import('../services/stripe.service');
    if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });

    const stripeCustomerId = (student as any).stripeCustomerId as string | null;
    if (!stripeCustomerId) return res.status(400).json({ error: 'No Stripe customer found' });

    // Verify the payment method belongs to this customer before detaching
    const pm = await stripe.paymentMethods.retrieve(id);
    if (pm.customer !== stripeCustomerId) {
      return res.status(403).json({ error: 'Payment method does not belong to this account' });
    }

    await stripe.paymentMethods.detach(id);
    res.json({ message: 'Payment method removed successfully' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Error removing payment method' });
  }
};

