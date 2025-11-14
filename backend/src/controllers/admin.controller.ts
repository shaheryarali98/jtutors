import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAdminSettings, updateAdminSettings } from '../services/settings.service';
import { ensureGoogleClassroomForBooking } from '../services/classSession.service';
import { confirmPayment, markPaymentRefunded } from '../services/payment.service';
import { getGoogleClassroomStatus } from '../services/googleClassroom.service';

const prisma = new PrismaClient();

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalTutors, totalStudents, totalBookings, tutorCompletion, newSignups] = await Promise.all([
      prisma.user.count(),
      prisma.tutor.count(),
      prisma.student.count(),
      prisma.booking.count(),
      prisma.tutor.aggregate({
        _avg: {
          profileCompletionPercentage: true
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const popularSubjects = await prisma.tutorSubject.groupBy({
      by: ['subjectId'],
      _count: {
        subjectId: true
      },
      orderBy: {
        _count: {
          subjectId: 'desc'
        }
      },
      take: 5
    });

    const subjects = await prisma.subject.findMany({
      where: {
        id: {
          in: popularSubjects.map((subject) => subject.subjectId)
        }
      }
    });

    res.json({
      analytics: {
        totals: {
          users: totalUsers,
          tutors: totalTutors,
          students: totalStudents,
          bookings: totalBookings
        },
        averages: {
          tutorProfileCompletion: tutorCompletion._avg.profileCompletionPercentage || 0
        },
        trends: {
          newSignupsLast7Days: newSignups
        },
        popularSubjects: popularSubjects.map((entry) => {
          const subject = subjects.find((s) => s.id === entry.subjectId);
          return {
            subjectId: entry.subjectId,
            subjectName: subject?.name || 'Unknown',
            tutorCount: entry._count.subjectId
          };
        })
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Error fetching analytics' });
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        tutor: true,
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      users: users.map(({ password, ...user }) => user)
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, emailConfirmed } = req.body as { role?: 'STUDENT' | 'TUTOR' | 'ADMIN'; emailConfirmed?: boolean };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tutor: true,
        student: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(role && { role }),
          ...(typeof emailConfirmed === 'boolean' && { emailConfirmed })
        },
        include: {
          tutor: true,
          student: true
        }
      });

      if (role === 'TUTOR' && !updated.tutor) {
        await tx.tutor.create({
          data: {
            userId: updated.id
          }
        });
      }

      if (role === 'STUDENT' && !updated.student) {
        await tx.student.create({
          data: {
            userId: updated.id
          }
        });
      }

      return updated;
    });

    const { password, ...safeUser } = result;

    res.json({
      message: 'User updated successfully',
      user: safeUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Error updating user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await getAdminSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Error fetching admin settings' });
  }
};

export const updateSettingsController = async (req: Request, res: Response) => {
  try {
    const {
      sendSignupConfirmation,
      sendProfileCompletionEmail,
      adminCommissionPercentage,
      adminCommissionFixed,
      withdrawalAutoApproveDays,
    } = req.body;

    const updated = await updateAdminSettings({
      ...(typeof sendSignupConfirmation === 'boolean' && { sendSignupConfirmation }),
      ...(typeof sendProfileCompletionEmail === 'boolean' && { sendProfileCompletionEmail }),
      ...(typeof adminCommissionPercentage === 'number' && { adminCommissionPercentage }),
      ...(typeof adminCommissionFixed === 'number' && { adminCommissionFixed }),
      ...(typeof withdrawalAutoApproveDays === 'number' && { withdrawalAutoApproveDays }),
      ...(withdrawalAutoApproveDays === null && { withdrawalAutoApproveDays: null }),
    });

    res.json({
      message: 'Settings updated successfully',
      settings: updated
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Error updating settings' });
  }
};

export const getBookingsAdmin = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const bookings = await prisma.booking.findMany({
      where: status ? { status: status as string } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: true } },
        tutor: { include: { user: true } },
        payment: true,
        classSession: true,
      },
    });

    res.json({
      bookings: bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        createdAt: booking.createdAt,
        studentEmail: booking.student?.user.email || null,
        tutorEmail: booking.tutor?.user.email || null,
        payment: booking.payment
          ? {
              id: booking.payment.id,
              amount: booking.payment.amount,
              currency: booking.payment.currency,
              paymentStatus: booking.payment.paymentStatus,
              paidAt: booking.payment.paidAt,
            }
          : null,
        classSession: booking.classSession
          ? {
              id: booking.classSession.id,
              status: booking.classSession.status,
              googleClassroomLink: booking.classSession.googleClassroomLink,
              googleMeetLink: booking.classSession.googleMeetLink,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Get bookings admin error:', error);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
};

export const updateBookingStatusAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    const allowedStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    if (!status || !allowedStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: status.toUpperCase() },
      include: {
        student: { include: { user: true } },
        tutor: { include: { user: true } },
        payment: true,
        classSession: true,
      },
    });

    res.json({
      message: 'Booking updated successfully',
      booking: {
        id: updated.id,
        status: updated.status,
        startTime: updated.startTime,
        endTime: updated.endTime,
        createdAt: updated.createdAt,
        studentEmail: updated.student?.user.email || null,
        tutorEmail: updated.tutor?.user.email || null,
        payment: updated.payment
          ? {
              id: updated.payment.id,
              amount: updated.payment.amount,
              currency: updated.payment.currency,
              paymentStatus: updated.payment.paymentStatus,
              paidAt: updated.payment.paidAt,
            }
          : null,
        classSession: updated.classSession
          ? {
              id: updated.classSession.id,
              status: updated.classSession.status,
              googleClassroomLink: updated.classSession.googleClassroomLink,
              googleMeetLink: updated.classSession.googleMeetLink,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Update booking admin error:', error);
    res.status(500).json({ error: 'Error updating booking' });
  }
};

export const createGoogleClassroomForBookingAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { className } = req.body as { className?: string };

    const session = await ensureGoogleClassroomForBooking(id, className);

    res.json({
      message: 'Google Classroom resources provisioned successfully',
      classSession: session,
    });
  } catch (error: any) {
    console.error('Create Google Classroom for booking error:', error);
    res.status(500).json({ error: error.message || 'Error connecting Google Classroom' });
  }
};

export const getPaymentsAdmin = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            student: { include: { user: true } },
            tutor: { include: { user: true } },
          },
        },
      },
    });

    res.json({
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        paymentStatus: payment.paymentStatus,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        bookingId: payment.bookingId,
        studentEmail: payment.booking?.student?.user.email || null,
        tutorEmail: payment.booking?.tutor?.user.email || null,
      })),
    });
  } catch (error) {
    console.error('Get payments admin error:', error);
    res.status(500).json({ error: 'Error fetching payments' });
  }
};

export const confirmPaymentAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await confirmPayment(id);
    res.json({
      message: 'Payment confirmed successfully',
      payment,
    });
  } catch (error: any) {
    console.error('Confirm payment admin error:', error);
    res.status(500).json({ error: error.message || 'Error confirming payment' });
  }
};

export const refundPaymentAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await markPaymentRefunded(id);
    res.json({
      message: 'Payment marked as refunded',
      payment,
    });
  } catch (error) {
    console.error('Refund payment admin error:', error);
    res.status(500).json({ error: 'Error marking payment as refunded' });
  }
};

export const getGoogleClassroomStatusAdmin = async (_req: Request, res: Response) => {
  try {
    const status = getGoogleClassroomStatus();
    res.json({ status });
  } catch (error) {
    console.error('Get Google Classroom status error:', error);
    res.status(500).json({ error: 'Error fetching Google Classroom status' });
  }
};

