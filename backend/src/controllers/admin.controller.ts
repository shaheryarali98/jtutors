import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAdminSettings, getFormattedAdminSettings, updateAdminSettings } from '../services/settings.service';
import { ensureGoogleClassroomForBooking } from '../services/classSession.service';
import { confirmPayment, markPaymentRefunded } from '../services/payment.service';
import { getGoogleClassroomStatus } from '../services/googleClassroom.service';
import { calculateProfileCompletion } from './tutor.controller';
import { stripe } from '../services/stripe.service';

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
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileCompletionPercentage: true,
            profileCompleted: true,
            stripeAccountId: true,
            stripeOnboarded: true,
            backgroundCheck: {
              select: {
                status: true,
                checkrStatus: true,
                checkrCompletedAt: true,
              }
            }
          }
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileCompleted: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Live-check Stripe status for tutors with accounts that aren't marked as onboarded
    if (stripe) {
      const tutorsToCheck = users.filter(u => u.tutor?.stripeAccountId && !u.tutor?.stripeOnboarded);
      for (const user of tutorsToCheck) {
        try {
          const account = await stripe.accounts.retrieve(user.tutor!.stripeAccountId!);
          const onboarded = account.charges_enabled && account.payouts_enabled;
          if (onboarded) {
            await prisma.tutor.update({
              where: { id: user.tutor!.id },
              data: { stripeOnboarded: true }
            });
            (user.tutor as any).stripeOnboarded = true;
            await calculateProfileCompletion(user.tutor!.id);
          }
        } catch (e) {
          // Skip if Stripe check fails for this user
        }
      }
    }

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
    const settings = await getFormattedAdminSettings();
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
      autoApproveUsers,
      adminCommissionPercentage,
      adminCommissionFixed,
      withdrawalAutoApproveDays,
      withdrawMethods,
      withdrawFixedCharge,
      withdrawPercentageCharge,
      minimumWithdrawAmount,
      minimumBalanceForWithdraw,
      withdrawThreshold,
      genderFieldEnabled,
      gradeFieldEnabled,
      stateFieldEnabled,
      emailLogo,
      emailSenderName,
      emailSenderEmail,
      emailFooterCopyright,
      emailSenderSignature,
      emailFooterColor,
      defaultStudentImage,
      defaultTutorImage,
    } = req.body;

    const numeric = (value: unknown) => {
      if (value === null || value === '' || typeof value === 'undefined') return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const updates: Record<string, any> = {
      ...(typeof sendSignupConfirmation === 'boolean' && { sendSignupConfirmation }),
      ...(typeof sendProfileCompletionEmail === 'boolean' && { sendProfileCompletionEmail }),
      ...(typeof autoApproveUsers === 'boolean' && { autoApproveUsers }),
      ...(numeric(adminCommissionPercentage) !== undefined && {
        adminCommissionPercentage: numeric(adminCommissionPercentage),
      }),
      ...(numeric(adminCommissionFixed) !== undefined && {
        adminCommissionFixed: numeric(adminCommissionFixed),
      }),
      ...(typeof withdrawalAutoApproveDays === 'number' && { withdrawalAutoApproveDays }),
      ...(withdrawalAutoApproveDays === null && { withdrawalAutoApproveDays: null }),
      ...(Array.isArray(withdrawMethods) && { withdrawMethods }),
      ...(numeric(withdrawFixedCharge) !== undefined && { withdrawFixedCharge: numeric(withdrawFixedCharge) }),
      ...(numeric(withdrawPercentageCharge) !== undefined && {
        withdrawPercentageCharge: numeric(withdrawPercentageCharge),
      }),
      ...(numeric(minimumWithdrawAmount) !== undefined && {
        minimumWithdrawAmount: numeric(minimumWithdrawAmount),
      }),
      ...(numeric(minimumBalanceForWithdraw) !== undefined && {
        minimumBalanceForWithdraw: numeric(minimumBalanceForWithdraw),
      }),
      ...(typeof withdrawThreshold === 'number' && { withdrawThreshold }),
      ...(withdrawThreshold === null && { withdrawThreshold: null }),
      ...(typeof genderFieldEnabled === 'boolean' && { genderFieldEnabled }),
      ...(typeof gradeFieldEnabled === 'boolean' && { gradeFieldEnabled }),
      ...(typeof stateFieldEnabled === 'boolean' && { stateFieldEnabled }),
      ...(typeof emailLogo === 'string' && { emailLogo }),
      ...(typeof emailSenderName === 'string' && { emailSenderName }),
      ...(typeof emailSenderEmail === 'string' && { emailSenderEmail }),
      ...(typeof emailFooterCopyright === 'string' && { emailFooterCopyright }),
      ...(typeof emailSenderSignature === 'string' && { emailSenderSignature }),
      ...(typeof emailFooterColor === 'string' && { emailFooterColor }),
      ...(typeof defaultStudentImage === 'string' && { defaultStudentImage }),
      ...(typeof defaultTutorImage === 'string' && { defaultTutorImage }),
    };

    const updated = await updateAdminSettings(updates);

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

export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tutor: {
          include: {
            experiences: true,
            educations: true,
            subjects: { include: { subject: true } },
            availabilities: true,
            backgroundCheck: true,
          },
        },
        student: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...safeUser } = user;

    // Live-check Stripe status if tutor has a Stripe account but isn't marked as onboarded
    if (safeUser.tutor && safeUser.tutor.stripeAccountId && !safeUser.tutor.stripeOnboarded && stripe) {
      try {
        const account = await stripe.accounts.retrieve(safeUser.tutor.stripeAccountId);
        const onboarded = account.charges_enabled && account.payouts_enabled;
        if (onboarded) {
          await prisma.tutor.update({
            where: { id: safeUser.tutor.id },
            data: { stripeOnboarded: true }
          });
          (safeUser.tutor as any).stripeOnboarded = true;
          await calculateProfileCompletion(safeUser.tutor.id);
        }
      } catch (e) {
        console.error('Error live-checking Stripe status:', e);
      }
    }

    // Parse JSON-string arrays for the frontend
    if (safeUser.tutor) {
      const t = safeUser.tutor as any;
      const tryParse = (v: any) => {
        if (Array.isArray(v)) return v;
        if (!v) return [];
        try { return JSON.parse(v); } catch { return []; }
      };
      t.gradesCanTeach = tryParse(t.gradesCanTeach);
      t.languagesSpoken = tryParse(t.languagesSpoken);
      if (t.availabilities) {
        t.availabilities = t.availabilities.map((a: any) => ({
          ...a,
          daysAvailable: tryParse(a.daysAvailable),
        }));
      }
    }

    if (safeUser.student) {
      const s = safeUser.student as any;
      const tryParse = (v: any) => {
        if (Array.isArray(v)) return v;
        if (!v) return [];
        try { return JSON.parse(v); } catch { return []; }
      };
      s.languagesSpoken = tryParse(s.languagesSpoken);
      s.learningPreferences = tryParse(s.learningPreferences);
    }

    res.json({ user: safeUser });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
};

export const getPublicTutors = async (req: Request, res: Response) => {
  try {
    const { subject, city, state, country, limit } = req.query;

    const tutors = await prisma.tutor.findMany({
      where: {
        user: { emailConfirmed: true },
        backgroundCheck: {
          status: 'APPROVED',
        },
        ...(city && { city: city as string }),
        ...(state && { state: state as string }),
        ...(country && { country: country as string }),
        ...(subject && {
          subjects: {
            some: {
              subject: { name: subject as string },
            },
          },
        }),
      },
      include: {
        subjects: { include: { subject: true } },
        experiences: true,
        educations: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 12,
    });

    const formatted = tutors.map((tutor) => {
      const tryParse = (v: any) => {
        if (Array.isArray(v)) return v;
        if (!v) return [];
        try { return JSON.parse(v); } catch { return []; }
      };
      return {
        id: tutor.id,
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        profileImage: tutor.profileImage,
        tagline: tutor.tagline,
        hourlyFee: tutor.hourlyFee,
        city: tutor.city,
        state: tutor.state,
        country: tutor.country,
        languagesSpoken: tryParse(tutor.languagesSpoken),
        gradesCanTeach: tryParse(tutor.gradesCanTeach),
        subjects: tutor.subjects.map((ts) => ts.subject.name),
        experienceCount: tutor.experiences.length,
        educationCount: tutor.educations.length,
      };
    });

    res.json({ tutors: formatted });
  } catch (error) {
    console.error('Get public tutors error:', error);
    res.status(500).json({ error: 'Error fetching tutors' });
  }
};

export const updateBackgroundCheckStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body as { status: string };

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'REVIEW'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const tutor = await prisma.tutor.findUnique({ where: { userId } });
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' });

    const bgCheck = await prisma.backgroundCheck.findUnique({ where: { tutorId: tutor.id } });
    if (!bgCheck) return res.status(404).json({ error: 'No background check submission found for this tutor' });

    const updated = await prisma.backgroundCheck.update({
      where: { id: bgCheck.id },
      data: { status },
    });

    // Keep tutor.backgroundCheckCompleted in sync
    await prisma.tutor.update({
      where: { id: tutor.id },
      data: { backgroundCheckCompleted: status === 'APPROVED' },
    });

    // Recalculate profile completion so profileCompleted flag is up-to-date.
    // This is critical — getPublicTutors filters by profileCompleted: true.
    const completion = await calculateProfileCompletion(tutor.id);

    return res.json({ message: `Background check status updated to ${status}`, backgroundCheck: updated, profileCompletion: completion });
  } catch (error) {
    console.error('Update background check status error:', error);
    res.status(500).json({ error: 'Error updating background check status' });
  }
};

