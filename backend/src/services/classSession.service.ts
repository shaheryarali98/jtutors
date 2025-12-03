import { PrismaClient } from '@prisma/client';
import { createCourse, createMeetLink, addStudentToCourse, addTeacherToCourse } from './googleClassroom.service';
import { sendTemplatedEmail } from './emailTemplate.service';

const prisma = new PrismaClient();

export interface CreateClassSessionData {
  bookingId: string;
  className?: string;
}

// Create class session with Google Classroom integration
export const createClassSession = async (data: CreateClassSessionData) => {
  const { bookingId, className } = data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { include: { user: true } },
      tutor: { include: { user: true } },
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Create Google Classroom course
  let googleClassroomId: string | null = null;
  let googleClassroomLink: string | null = null;
  let googleMeetLink: string | null = null;

  try {
    const courseName = className || `Class with ${booking.tutor.user.email}`;
    const course = await createCourse(
      courseName,
      `Session on ${booking.startTime.toLocaleDateString()}`,
      `Tutoring session between ${booking.student.user.email} and ${booking.tutor.user.email}`
    );

    if (course) {
      googleClassroomId = course.id;
      googleClassroomLink = course.alternateLink;

      // Create Meet link with booking times
      googleMeetLink = await createMeetLink(
        course.id,
        booking.startTime,
        booking.endTime,
        courseName
      );

      // Add student and tutor to course
      await addStudentToCourse(course.id, booking.student.user.email);
      await addTeacherToCourse(course.id, booking.tutor.user.email);
    }
  } catch (error) {
    console.error('Error creating Google Classroom course:', error);
    // Continue without Google Classroom if it fails
  }

  // Create class session
  const classSession = await prisma.classSession.create({
    data: {
      bookingId,
      googleClassroomId,
      googleClassroomLink,
      googleMeetLink,
      status: 'SCHEDULED',
    },
    include: {
      booking: {
        include: {
          student: { include: { user: true } },
          tutor: { include: { user: true } },
        },
      },
    },
  });

  return classSession;
};

// Mark class as completed by tutor
export const completeClassSession = async (
  classSessionId: string,
  tutorId: string,
  notes?: string,
  actualHoursTaught?: number
) => {
  const classSession = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      booking: {
        include: {
          tutor: true,
          student: { include: { user: true } },
          payment: true,
        },
      },
    },
  });

  if (!classSession) {
    throw new Error('Class session not found');
  }

  if (classSession.booking.tutorId !== tutorId) {
    throw new Error('Unauthorized: Only the assigned tutor can complete this class');
  }

  if (classSession.status === 'COMPLETED') {
    return classSession;
  }

  const updated = await prisma.classSession.update({
    where: { id: classSessionId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      tutorApproved: true,
      ...(actualHoursTaught && { actualHoursTaught }),
      ...(notes && { notes }),
    },
    include: {
      booking: {
        include: {
          student: { include: { user: true } },
          tutor: { include: { user: true } },
          payment: true,
        },
      },
    },
  });

  // Automatically release payment to tutor if payment is already paid
  if (updated.booking.payment && updated.booking.payment.paymentStatus === 'PAID') {
    try {
      const { releasePaymentToTutor } = await import('./paymentRelease.service');
      const releaseResult = await releasePaymentToTutor(classSessionId);
      
      if (!releaseResult.success) {
        console.warn('Payment release failed (will retry later):', releaseResult.error);
        // Don't throw error - payment release can be retried later
      }
    } catch (error) {
      console.error('Error releasing payment automatically:', error);
      // Don't throw error - payment release can be retried later
    }
  }

  return updated;
};

// Approve class session by admin (triggers payment)
export const approveClassSession = async (
  classSessionId: string,
  adminId: string,
  notes?: string
) => {
  const classSession = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      booking: {
        include: {
          student: { include: { user: true } },
          tutor: { include: { user: true } },
          payment: true,
        },
      },
    },
  });

  if (!classSession) {
    throw new Error('Class session not found');
  }

  if (classSession.status !== 'COMPLETED' || !classSession.tutorApproved) {
    throw new Error('Class must be completed and approved by tutor before admin approval');
  }

  if (classSession.adminApproved) {
    return classSession;
  }

  // Update class session
  const updated = await prisma.classSession.update({
    where: { id: classSessionId },
    data: {
      adminApproved: true,
      adminApprovedAt: new Date(),
      ...(notes && { notes: classSession.notes ? `${classSession.notes}\n${notes}` : notes }),
    },
    include: {
      booking: {
        include: {
          student: { include: { user: true } },
          tutor: { include: { user: true } },
          payment: true,
        },
      },
    },
  });

  // If payment exists and is pending, confirm it
  if (updated.booking.payment && updated.booking.payment.paymentStatus === 'PENDING') {
    try {
      const { confirmPayment } = await import('./payment.service');
      await confirmPayment(updated.booking.payment.id);
    } catch (error) {
      console.error('Error confirming payment after class approval:', error);
    }
  }

  // Send approval email
  try {
    await sendTemplatedEmail('CLASS_APPROVED', updated.booking.tutor.user.email, {
      userName: updated.booking.tutor.user.email,
      className: `Class on ${updated.booking.startTime.toLocaleDateString()}`,
      classId: updated.id,
    });
  } catch (error) {
    console.error('Error sending class approval email:', error);
  }

  return updated;
};

// Get class session by ID
export const getClassSession = async (classSessionId: string) => {
  return await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      booking: {
        include: {
          student: { include: { user: true } },
          tutor: { include: { user: true } },
          payment: true,
        },
      },
    },
  });
};

// Get class sessions by user
export const getClassSessionsByUser = async (userId: string, role: 'STUDENT' | 'TUTOR') => {
  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return [];

    return await prisma.classSession.findMany({
      where: {
        booking: {
          studentId: student.id,
        },
      },
      include: {
        booking: {
          include: {
            tutor: { include: { user: true } },
            payment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    const tutor = await prisma.tutor.findUnique({
      where: { userId },
    });
    if (!tutor) return [];

    return await prisma.classSession.findMany({
      where: {
        booking: {
          tutorId: tutor.id,
        },
      },
      include: {
        booking: {
          include: {
            student: { include: { user: true } },
            payment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
};

// Get all class sessions (admin)
export const getAllClassSessions = async (status?: string) => {
  return await prisma.classSession.findMany({
    where: status ? { status } : undefined,
    include: {
      booking: {
        include: {
          student: { include: { user: true } },
          tutor: { include: { user: true } },
          payment: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const ensureGoogleClassroomForBooking = async (bookingId: string, className?: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { include: { user: true } },
      tutor: { include: { user: true } },
      classSession: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (!booking.student?.user?.email || !booking.tutor?.user?.email) {
    throw new Error('Tutor or student email is missing.');
  }

  // If no class session exists yet, defer to createClassSession which already provisions Classroom resources.
  if (!booking.classSession) {
    return await createClassSession({ bookingId, className });
  }

  const existingSession = booking.classSession;

  // If Google resources already exist, return the current session as-is.
  if (existingSession.googleClassroomLink && existingSession.googleClassroomId && existingSession.googleMeetLink) {
    return await prisma.classSession.findUnique({
      where: { id: existingSession.id },
      include: {
        booking: {
          include: {
            student: { include: { user: true } },
            tutor: { include: { user: true } },
          },
        },
      },
    });
  }

  let googleClassroomId = existingSession.googleClassroomId;
  let googleClassroomLink = existingSession.googleClassroomLink;
  let googleMeetLink = existingSession.googleMeetLink;

  try {
    const courseName = className || `Class with ${booking.tutor.user.email}`;
    const course = await createCourse(
      courseName,
      `Session on ${booking.startTime.toLocaleDateString()}`,
      `Tutoring session between ${booking.student.user.email} and ${booking.tutor.user.email}`
    );

    if (course) {
      googleClassroomId = course.id;
      googleClassroomLink = course.alternateLink;

      await addStudentToCourse(course.id, booking.student.user.email);
      await addTeacherToCourse(course.id, booking.tutor.user.email);

      if (!googleMeetLink) {
        googleMeetLink = await createMeetLink(
          course.id,
          booking.startTime,
          booking.endTime,
          courseName
        );
      }
    }
  } catch (error: any) {
    console.error('Error provisioning Google Classroom resources:', error);
    // If Google Classroom is not configured, continue without it (graceful degradation)
    if (error.message === 'Google Classroom is not configured') {
      console.warn('Google Classroom is not configured. Continuing without Google Classroom integration.');
      // Don't throw error - allow the session to be updated without Google Classroom
    } else {
      // For other errors, still throw to allow caller to handle
      throw error;
    }
  }

  const updatedSession = await prisma.classSession.update({
    where: { id: existingSession.id },
    data: {
      googleClassroomId,
      googleClassroomLink,
      googleMeetLink,
    },
    include: {
      booking: {
        include: {
          student: { include: { user: true } },
          tutor: { include: { user: true } },
        },
      },
    },
  });

  return updatedSession;
};

