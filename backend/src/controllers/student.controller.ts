import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { formatStudent, formatTutor, formatTutorArray } from '../utils/formatters';
import { getAdminSettings } from '../services/settings.service';
import { sendEmail } from '../services/email.service';

const prisma = new PrismaClient();

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
  address?: string | null;
  zipcode?: string | null;
  languages: string[];
  learningPreferences: string[];
  introduction?: string | null;
}) => {
  return Boolean(
    payload.firstName &&
      payload.lastName &&
      payload.profileImage &&
      payload.gender &&
      payload.grade &&
      payload.bio &&
      payload.country &&
      payload.city &&
      payload.address &&
      payload.zipcode &&
      payload.languages.length > 0 &&
      payload.learningPreferences.length > 0 &&
      payload.introduction &&
      payload.tagline
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
      address,
      zipcode,
      languages: languageArray,
      learningPreferences: learningPreferenceArray,
      introduction,
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
    const { subject, minFee, maxFee, grade, city, state, country } = req.query;

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
        ...(minFee && { hourlyFee: { gte: parseFloat(minFee as string) } }),
        ...(maxFee && { hourlyFee: { lte: parseFloat(maxFee as string) } }),
        ...(grade && { gradesCanTeach: { contains: `"${grade}"` } }),
        ...(city && { city: city as string }),
        ...(state && { state: state as string }),
        ...(country && { country: country as string }),
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

    res.json({ tutor: { ...formatTutor(tutor as any), saved } });
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

    if (!student.profileCompleted) {
      return res.status(400).json({ error: 'Complete your profile before booking a tutor' });
    }

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
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
      },
    });

    res.status(201).json({
      message: 'Booking created successfully',
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
    }).catch(() => {});

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

