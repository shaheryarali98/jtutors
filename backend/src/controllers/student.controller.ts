import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { formatTutor, formatTutorArray } from '../utils/formatters';
import { getAdminSettings } from '../services/settings.service';
import { sendEmail } from '../services/email.service';

const prisma = new PrismaClient();

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { firstName, lastName, profileImage } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const wasCompleted = student.profileCompleted;

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        firstName,
        lastName,
        profileImage
      }
    });

    const nowCompleted = Boolean(updatedStudent.firstName && updatedStudent.lastName && updatedStudent.profileImage);

    if (updatedStudent.profileCompleted !== nowCompleted) {
      await prisma.student.update({
        where: { id: student.id },
        data: { profileCompleted: nowCompleted }
      });
      updatedStudent.profileCompleted = nowCompleted;
    }

    if (nowCompleted && !wasCompleted) {
      const settings = await getAdminSettings();
      if (settings.sendProfileCompletionEmail) {
        sendEmail({
          to: student.user.email,
          subject: 'JTutor Profile Complete',
          html: `
            <h2>Great work!</h2>
            <p>Your JTutor learner profile is now complete.</p>
            <p>You're all set to start booking sessions with tutors.</p>
            <p>Best of luck,<br/>The JTutor Team</p>
          `,
          text: `Your JTutor learner profile is now complete. You're all set!`
        }).catch((error) => console.error('Failed to send student profile completion email:', error));
      }
    }

    res.json({
      message: 'Profile updated successfully',
      student: updatedStudent,
      profileCompleted: nowCompleted
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

export const searchTutors = async (req: Request, res: Response) => {
  try {
    const { subject, minFee, maxFee, grade, city, state, country } = req.query;

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
                name: subject as string
              }
            }
          }
        })
      },
      include: {
        subjects: {
          include: {
            subject: true
          }
        },
        experiences: true,
        educations: true,
        availabilities: true
      }
    });

    res.json({ tutors: formatTutorArray(tutors as any) });
  } catch (error) {
    console.error('Search tutors error:', error);
    res.status(500).json({ error: 'Error searching tutors' });
  }
};

export const getTutorDetails = async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params;

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      include: {
        subjects: {
          include: {
            subject: true
          }
        },
        experiences: true,
        educations: true,
        availabilities: true
      }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    res.json({ tutor: formatTutor(tutor as any) });
  } catch (error) {
    console.error('Get tutor details error:', error);
    res.status(500).json({ error: 'Error fetching tutor details' });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tutorId, startTime, endTime } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Check if tutor exists
    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        studentId: student.id,
        tutorId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'PENDING'
      },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking
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
      where: { userId }
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
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
};

