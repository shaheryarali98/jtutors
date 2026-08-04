import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getAdminSettings, getFormattedAdminSettings, updateAdminSettings } from '../services/settings.service';
import { ensureGoogleClassroomForBooking } from '../services/classSession.service';
import { confirmPayment, markPaymentRefunded } from '../services/payment.service';
import { getGoogleClassroomStatus } from '../services/googleClassroom.service';
import { calculateProfileCompletion } from './tutor.controller';
import { stripe } from '../services/stripe.service';
import { gradeMatches } from '../utils/grade';
import { formatTutor, formatStudent } from '../utils/formatters';

const prisma = new PrismaClient();

const parseStringArray = (value: string | null | undefined): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string' && entry.trim().length > 0) : [];
  } catch {
    return [];
  }
};

const calculateStudentProfileCompleted = (student: {
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  grade: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  zipcode: string | null;
  languagesSpoken: string | null;
  learningPreferences: string | null;
}) => {
  return Boolean(
    student.firstName?.trim() &&
    student.lastName?.trim() &&
    student.gender?.trim() &&
    student.grade?.trim() &&
    student.bio?.trim() &&
    student.country?.trim() &&
    student.city?.trim() &&
    student.zipcode?.trim() &&
    parseStringArray(student.languagesSpoken).length > 0 &&
    parseStringArray(student.learningPreferences).length > 0
  );
};

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
            adminVerified: true,
            stripeAccountId: true,
            stripeOnboarded: true,
            jtutorsEmail: true,
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
            gender: true,
            grade: true,
            bio: true,
            country: true,
            city: true,
            zipcode: true,
            languagesSpoken: true,
            learningPreferences: true,
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
      users: users.map(({ password, ...user }) => ({
        ...user,
        student: user.student
          ? {
              ...user.student,
              profileCompleted: calculateStudentProfileCompleted(user.student),
            }
          : user.student,
      }))
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, emailConfirmed, email, password: newPassword } = req.body as {
      role?: 'STUDENT' | 'TUTOR' | 'ADMIN';
      emailConfirmed?: boolean;
      email?: string;
      password?: string;
    };

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

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;

    if (normalizedEmail && normalizedEmail !== user.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: 'A valid email address is required' });
      }

      const emailTaken = await prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id } },
        select: { id: true }
      });

      if (emailTaken) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }
    }

    if (typeof newPassword === 'string' && newPassword.length > 0 && newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hashedPassword =
      typeof newPassword === 'string' && newPassword.length > 0
        ? await bcrypt.hash(newPassword, 10)
        : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(role && { role }),
          ...(typeof emailConfirmed === 'boolean' && { emailConfirmed }),
          ...(normalizedEmail && normalizedEmail !== user.email && { email: normalizedEmail }),
          ...(hashedPassword && { password: hashedPassword })
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

export const updateUserProfileImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { profileImage, profileType, imageKind } = req.body as {
      profileImage?: string;
      profileType?: 'TUTOR' | 'STUDENT';
      imageKind?: 'PROFILE' | 'COVER';
    };

    if (!profileImage || typeof profileImage !== 'string') {
      return res.status(400).json({ error: 'A valid profileImage URL is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tutor: { select: { id: true } },
        student: { select: { id: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetType: 'TUTOR' | 'STUDENT' =
      profileType ?? (user.tutor ? 'TUTOR' : 'STUDENT');

    if (targetType === 'TUTOR') {
      if (!user.tutor) {
        return res.status(400).json({ error: 'Tutor profile not found for this user' });
      }

      const isCover = imageKind === 'COVER';

      const updatedTutor = await prisma.tutor.update({
        where: { id: user.tutor.id },
        data: isCover ? { coverImage: profileImage } : { profileImage },
        select: { id: true, profileImage: true, coverImage: true },
      });

      return res.json({
        message: `Tutor ${isCover ? 'cover' : 'profile'} image updated successfully`,
        profileType: 'TUTOR',
        imageKind: isCover ? 'COVER' : 'PROFILE',
        profileImage: updatedTutor.profileImage,
        coverImage: updatedTutor.coverImage,
      });
    }

    if (!user.student) {
      return res.status(400).json({ error: 'Student profile not found for this user' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: user.student.id },
      data: { profileImage },
      select: { id: true, profileImage: true },
    });

    return res.json({
      message: 'Student profile image updated successfully',
      profileType: 'STUDENT',
      profileImage: updatedStudent.profileImage,
    });
  } catch (error) {
    console.error('Update user profile image error:', error);
    res.status(500).json({ error: 'Error updating user profile image' });
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
      studentFeePercentage,
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
      adminPaymentInfo,
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
      ...(numeric(studentFeePercentage) !== undefined && {
        studentFeePercentage: numeric(studentFeePercentage),
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
      ...(typeof adminPaymentInfo === 'string' && { adminPaymentInfo }),
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

const mapAdminBooking = (booking: any) => {
  const durationHours =
    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60);

  return {
    id: booking.id,
    status: booking.status,
    startTime: booking.startTime,
    endTime: booking.endTime,
    createdAt: booking.createdAt,
    durationHours: Math.max(0.25, Math.round(durationHours * 100) / 100),
    studentEmail: booking.student?.user.email || null,
    studentName: `${booking.student?.firstName || ''} ${booking.student?.lastName || ''}`.trim() || null,
    tutorEmail: booking.tutor?.user.email || null,
    tutorName: `${booking.tutor?.firstName || ''} ${booking.tutor?.lastName || ''}`.trim() || null,
    payment: booking.payment
      ? {
          id: booking.payment.id,
          amount: booking.payment.amount,
          currency: booking.payment.currency,
          paymentStatus: booking.payment.paymentStatus,
          paidAt: booking.payment.paidAt,
          studentChargeAmount: (booking.payment as any).studentChargeAmount ?? booking.payment.amount,
          studentFeeAmount: (booking.payment as any).studentFeeAmount ?? null,
          tutorAmount: booking.payment.tutorAmount ?? null,
          tutorDeductionAmount: (booking.payment as any).tutorDeductionAmount ?? null,
          adminCommissionAmount: booking.payment.adminCommissionAmount ?? null,
        }
      : null,
    classSession: booking.classSession
      ? {
          id: booking.classSession.id,
          status: booking.classSession.status,
          googleClassroomLink: booking.classSession.googleClassroomLink,
          googleMeetLink: booking.classSession.googleMeetLink,
          pencilSpaceUrl: booking.classSession.pencilSpaceUrl,
          tutorApproved: booking.classSession.tutorApproved,
          adminApproved: booking.classSession.adminApproved,
          studentConfirmed: booking.classSession.studentConfirmed,
          paymentReleased: booking.classSession.paymentReleased,
          completedAt: booking.classSession.completedAt,
          actualHoursTaught: booking.classSession.actualHoursTaught,
          autoReleaseAt: booking.classSession.autoReleaseAt,
        }
      : null,
  };
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
      bookings: bookings.map(mapAdminBooking),
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
      booking: mapAdminBooking(updated),
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
        // breakdown fields
        tutorAmount:          payment.tutorAmount,
        studentFeeAmount:     (payment as any).studentFeeAmount    ?? null,
        tutorDeductionAmount: (payment as any).tutorDeductionAmount ?? null,
        adminCommissionAmount: payment.adminCommissionAmount,
        studentChargeAmount:  (payment as any).studentChargeAmount  ?? payment.amount,
        stripeCheckoutSessionId: (payment as any).stripeCheckoutSessionId ?? null,
      })),
    });
  } catch (error) {
    console.error('Get payments admin error:', error);
    res.status(500).json({ error: 'Error fetching payments' });
  }
};

export const getExtraTimeChargesAdmin = async (_req: Request, res: Response) => {
  try {
    const charges = await prisma.extraTimeCharge.findMany({
      orderBy: { requestedAt: 'desc' },
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
      extraTimeCharges: charges.map((charge) => ({
        id: charge.id,
        bookingId: charge.bookingId,
        classSessionId: charge.classSessionId,
        status: charge.status,
        scheduledHours: charge.scheduledHours,
        actualHours: charge.actualHours,
        extraHours: charge.extraHours,
        baseAmount: charge.baseAmount,
        studentChargeAmount: charge.studentChargeAmount,
        studentFeeAmount: charge.studentFeeAmount,
        adminCommissionAmount: charge.adminCommissionAmount,
        tutorAmount: charge.tutorAmount,
        stripeCheckoutSessionId: charge.stripeCheckoutSessionId,
        stripePaymentIntentId: charge.stripePaymentIntentId,
        paidAt: charge.paidAt,
        requestedAt: charge.requestedAt,
        studentEmail: charge.booking?.student?.user.email || null,
        tutorEmail: charge.booking?.tutor?.user.email || null,
      })),
    });
  } catch (error) {
    console.error('Get extra-time charges admin error:', error);
    res.status(500).json({ error: 'Error fetching extra-time charges' });
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
    const { subject, city, state, country, location, minFee, maxFee, grade, search } = req.query;

    const normalizeText = (value: unknown) =>
      typeof value === 'string' ? value.trim().toLowerCase() : '';

    const parseStoredList = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value
          .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
          .filter((entry) => entry.length > 0);
      }

      if (typeof value !== 'string') {
        return [];
      }

      const parsed = parseStringArray(value)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      if (parsed.length > 0) {
        return parsed;
      }

      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    };

    const subjectFilter = normalizeText(subject);
    const gradeFilter = normalizeText(grade);
    const locationFilter = normalizeText(location);
    const searchFilter = normalizeText(search);
    const cityFilter = normalizeText(city);
    const stateFilter = normalizeText(state);
    const countryFilter = normalizeText(country);

    const tutors = await prisma.tutor.findMany({
      where: {
        user: { emailConfirmed: true },
        backgroundCheck: {
          status: 'APPROVED',
        },
        ...((minFee || maxFee) ? { hourlyFee: { ...(minFee ? { gte: parseFloat(minFee as string) } : {}), ...(maxFee ? { lte: parseFloat(maxFee as string) } : {}) } } : {}),
      },
      include: {
        subjects: { include: { subject: true } },
        experiences: true,
        educations: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const filteredTutors = tutors.filter((tutor) => {
      const subjectNames = tutor.subjects.map((entry) => entry.subject.name);
      const subjectNamesNormalized = subjectNames.map((name) => normalizeText(name));
      const grades = parseStoredList(tutor.gradesCanTeach);
      const cityText = tutor.city || '';
      const stateText = tutor.state || '';
      const countryText = tutor.country || '';
      const locationText = [cityText, stateText, countryText].filter(Boolean).join(' ');
      const locationNormalized = normalizeText(locationText);
      const searchableText = [
        `${tutor.firstName || ''} ${tutor.lastName || ''}`,
        tutor.tagline || '',
        subjectNames.join(' '),
        locationText,
      ]
        .join(' ')
        .toLowerCase();

      if (subjectFilter && !subjectNamesNormalized.some((name) => name.includes(subjectFilter))) {
        return false;
      }

      if (gradeFilter && !grades.some((entry) => gradeMatches(entry, gradeFilter))) {
        return false;
      }

      if (locationFilter && !locationNormalized.includes(locationFilter)) {
        return false;
      }

      if (cityFilter && normalizeText(cityText) !== cityFilter) {
        return false;
      }

      if (stateFilter && normalizeText(stateText) !== stateFilter) {
        return false;
      }

      if (countryFilter && normalizeText(countryText) !== countryFilter) {
        return false;
      }

      if (searchFilter && !searchableText.includes(searchFilter)) {
        return false;
      }

      return true;
    });

    const total = filteredTutors.length;
    const tutorsForResponse = filteredTutors;

    const formatted = tutorsForResponse.map((tutor) => {
      const tryParse = (v: any) => {
        if (Array.isArray(v)) return v;
        if (!v) return [];
        try { return JSON.parse(v); } catch { return []; }
      };
      return {
        id: tutor.id,
        firstName: tutor.firstName || '',
        lastName: tutor.lastName || '',
        profileImage: tutor.profileImage,
        coverImage: tutor.coverImage,
        tagline: tutor.tagline,
        hourlyFee: tutor.hourlyFee,
        city: tutor.city,
        state: tutor.state,
        country: tutor.country,
        adminVerified: Boolean(tutor.adminVerified),
        languagesSpoken: tryParse(tutor.languagesSpoken),
        gradesCanTeach: tryParse(tutor.gradesCanTeach),
        subjects: tutor.subjects.map((ts) => ts.subject.name),
        experienceCount: tutor.experiences.length,
        educationCount: tutor.educations.length,
      };
    });

    res.json({
      tutors: formatted,
      total: total,
      totalMatchingTutors: total,
      page: 1,
      totalPages: 1,
      pageSize: formatted.length,
      isPreview: false,
    });
  } catch (error) {
    console.error('Get public tutors error:', error);
    res.status(500).json({ error: 'Error fetching tutors' });
  }
};

export const getPublicTutorDetails = async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params;

    const tutor = await prisma.tutor.findFirst({
      where: {
        id: tutorId,
        user: { emailConfirmed: true },
        backgroundCheck: {
          status: 'APPROVED',
        },
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
        user: { select: { email: true } },
      },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    const formattedTutor = formatTutor(tutor as any) as any;
    res.json({
      tutor: {
        ...formattedTutor,
        firstName: formattedTutor.firstName || '',
        lastName: formattedTutor.lastName || '',
        saved: false,
      },
    });
  } catch (error) {
    console.error('Get public tutor detail error:', error);
    res.status(500).json({ error: 'Error fetching tutor details' });
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

export const updateTutorVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params;
    const { adminVerified } = req.body as { adminVerified?: boolean };

    if (typeof adminVerified !== 'boolean') {
      return res.status(400).json({ error: 'adminVerified must be a boolean' });
    }

    const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    const updatedTutor = await prisma.tutor.update({
      where: { id: tutorId },
      data: { adminVerified },
      select: {
        id: true,
        adminVerified: true,
      },
    });

    return res.json({
      message: `Tutor verification ${adminVerified ? 'enabled' : 'removed'} successfully`,
      tutor: updatedTutor,
    });
  } catch (error) {
    console.error('Update tutor verification status error:', error);
    return res.status(500).json({ error: 'Error updating tutor verification status' });
  }
};

// ── Set JTutors provisioned email for a tutor ─────────────────────────────────
export const setTutorJTutorsEmail = async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params;
    const { jtutorsEmail } = req.body as { jtutorsEmail: string };

    if (!jtutorsEmail || !jtutorsEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid jtutorsEmail is required' });
    }

    const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' });

    const updated = await prisma.tutor.update({
      where: { id: tutorId },
      data: { jtutorsEmail },
    });

    return res.json({ message: 'JTutors email assigned', jtutorsEmail: updated.jtutorsEmail });
  } catch (error) {
    console.error('Set JTutors email error:', error);
    res.status(500).json({ error: 'Error setting JTutors email' });
  }
};

// List all courses with tutor + enrollment summary (admin oversight)
export const listCoursesAdmin = async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            stripeOnboarded: true,
            jtutorsEmail: true,
            user: { select: { email: true } },
          },
        },
        _count: { select: { enrollments: true } },
        enrollments: {
          select: { id: true, status: true, amount: true },
        },
      },
    });

    const result = courses.map((c) => {
      const paid = c.enrollments.filter((e) => e.status === 'PAID');
      const totalRevenue = paid.reduce((sum, e) => sum + (e.amount || 0), 0);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        status: c.status,
        meetingType: c.meetingType,
        meetingLink: c.meetingLink,
        schedule: c.schedule,
        createdAt: c.createdAt,
        tutor: {
          id: c.tutor.id,
          firstName: c.tutor.firstName,
          lastName: c.tutor.lastName,
          email: c.tutor.user?.email,
          stripeOnboarded: c.tutor.stripeOnboarded,
          jtutorsEmail: c.tutor.jtutorsEmail,
        },
        enrollmentsCount: c._count.enrollments,
        paidEnrollments: paid.length,
        totalRevenue,
      };
    });

    return res.json({ courses: result });
  } catch (error) {
    console.error('List courses admin error:', error);
    res.status(500).json({ error: 'Error fetching courses' });
  }
};

export const getAdminEarnings = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [commissionData, withdrawals] = await Promise.all([
      prisma.payment.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { adminCommissionAmount: true },
        _count: { id: true },
      }),
      prisma.withdrawal.groupBy({
        by: ['status'],
        where: { userId, userType: 'ADMIN' },
        _sum: { amount: true },
      }),
    ]);

    const recentPayments = await prisma.payment.findMany({
      where: { paymentStatus: 'PAID' },
      orderBy: { paidAt: 'desc' },
      take: 20,
      include: {
        booking: {
          include: {
            student: { include: { user: true } },
            tutor: { include: { user: true } },
          },
        },
      },
    });

    const totalCommission = commissionData._sum.adminCommissionAmount ?? 0;
    const withdrawn = withdrawals
      .filter((w) => w.status === 'COMPLETED')
      .reduce((a, w) => a + (w._sum.amount ?? 0), 0);
    const pending = withdrawals
      .filter((w) => ['PENDING', 'APPROVED', 'PROCESSING'].includes(w.status))
      .reduce((a, w) => a + (w._sum.amount ?? 0), 0);

    const settings = await getAdminSettings();

    return res.json({
      summary: {
        totalCommission,
        availableBalance: Math.max(0, totalCommission - withdrawn - pending),
        totalWithdrawn: withdrawn,
        pendingWithdrawals: pending,
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        adminCommissionAmount: p.adminCommissionAmount,
        currency: p.currency,
        paidAt: p.paidAt,
        studentEmail: p.booking?.student?.user?.email ?? null,
        tutorEmail: p.booking?.tutor?.user?.email ?? null,
      })),
      adminPaymentInfo: (settings as any).adminPaymentInfo ?? '',
    });
  } catch (error) {
    console.error('Get admin earnings error:', error);
    res.status(500).json({ error: 'Error fetching admin earnings' });
  }
};

export const suspendUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { suspended } = req.body as { suspended: boolean };

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ error: 'suspended field must be a boolean' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isSuspended: suspended },
      select: { id: true, email: true, role: true, isSuspended: true },
    });

    res.json({
      message: suspended ? 'User suspended successfully' : 'User unsuspended successfully',
      user: updated,
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Error updating user suspension status' });
  }
};

export const getLoginHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const audits = await prisma.loginAudit.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true },
    });

    res.json({ logins: audits });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({ error: 'Error fetching login history' });
  }
};

/* ──────────────────────────────────────────────────────────────
 * Admin profile management — full edit control over tutor and
 * student profiles (personal info, languages, images, subjects,
 * experience, education, availability).
 * ────────────────────────────────────────────────────────────── */

/** Only include a key when the client actually sent it, so PATCH stays partial. */
const pick = <T>(body: Record<string, unknown>, key: string, transform: (value: any) => T) =>
  Object.prototype.hasOwnProperty.call(body, key) ? { [key]: transform(body[key]) } : {};

const toNullableString = (value: unknown): string | null => {
  if (value === null || typeof value === 'undefined') return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const toStoredArray = (value: unknown): string => {
  if (!Array.isArray(value)) return JSON.stringify([]);
  const cleaned = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
    .filter((entry) => entry.length > 0);
  return JSON.stringify(Array.from(new Set(cleaned)));
};

const toBoolean = (value: unknown): boolean =>
  typeof value === 'string' ? value === 'true' : Boolean(value);

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const updateTutorProfileAdmin = async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      select: { id: true, userId: true },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    let hourlyFee: number | undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'hourlyFee')) {
      const raw = body.hourlyFee;
      if (raw === null || raw === '') {
        hourlyFee = undefined;
      } else {
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) {
          return res.status(400).json({ error: 'Hourly fee must be a valid number' });
        }
        if (parsed < 20 || parsed > 500) {
          return res.status(400).json({ error: 'Hourly fee must be between $20 and $500' });
        }
        hourlyFee = parsed;
      }
    }

    const data = {
      ...pick(body, 'firstName', toNullableString),
      ...pick(body, 'lastName', toNullableString),
      ...pick(body, 'gender', toNullableString),
      ...pick(body, 'tagline', toNullableString),
      ...pick(body, 'country', toNullableString),
      ...pick(body, 'state', toNullableString),
      ...pick(body, 'city', toNullableString),
      ...pick(body, 'address', toNullableString),
      ...pick(body, 'zipcode', toNullableString),
      ...pick(body, 'timezone', toNullableString),
      ...pick(body, 'jtutorsEmail', toNullableString),
      ...pick(body, 'profileImage', toNullableString),
      ...pick(body, 'coverImage', toNullableString),
      ...pick(body, 'languagesSpoken', toStoredArray),
      ...pick(body, 'gradesCanTeach', toStoredArray),
      ...pick(body, 'isAtLeast21Confirmed', toBoolean),
      ...(typeof hourlyFee === 'number' ? { hourlyFee } : {}),
    };

    // Optional user-account email change alongside the profile edit
    const accountEmail = toNullableString(body.email);
    if (accountEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
        return res.status(400).json({ error: 'A valid email address is required' });
      }
      const taken = await prisma.user.findFirst({
        where: { email: accountEmail.toLowerCase(), NOT: { id: tutor.userId } },
        select: { id: true },
      });
      if (taken) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }
      await prisma.user.update({
        where: { id: tutor.userId },
        data: { email: accountEmail.toLowerCase() },
      });
    }

    const updated = await prisma.tutor.update({ where: { id: tutorId }, data });
    const profileCompletion = await calculateProfileCompletion(tutorId);

    res.json({
      message: 'Tutor profile updated successfully',
      tutor: formatTutor(updated as any),
      profileCompletion,
    });
  } catch (error) {
    console.error('Admin update tutor profile error:', error);
    res.status(500).json({ error: 'Error updating tutor profile' });
  }
};

export const setTutorSubjectsAdmin = async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params;
    const { subjectIds } = req.body as { subjectIds?: string[] };

    if (!Array.isArray(subjectIds)) {
      return res.status(400).json({ error: 'subjectIds must be an array' });
    }

    const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { id: true } });
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const uniqueIds = Array.from(new Set(subjectIds.filter((id) => typeof id === 'string' && id.trim())));

    const existingSubjects = await prisma.subject.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const validIds = existingSubjects.map((subject) => subject.id);

    await prisma.$transaction([
      prisma.tutorSubject.deleteMany({ where: { tutorId } }),
      ...(validIds.length > 0
        ? [prisma.tutorSubject.createMany({ data: validIds.map((subjectId) => ({ tutorId, subjectId })) })]
        : []),
    ]);

    const subjects = await prisma.tutorSubject.findMany({
      where: { tutorId },
      include: { subject: true },
    });
    const profileCompletion = await calculateProfileCompletion(tutorId);

    res.json({ message: 'Tutor subjects updated successfully', subjects, profileCompletion });
  } catch (error) {
    console.error('Admin set tutor subjects error:', error);
    res.status(500).json({ error: 'Error updating tutor subjects' });
  }
};

export const saveTutorExperienceAdmin = async (req: Request, res: Response) => {
  try {
    const { tutorId, experienceId } = req.params;
    const { jobTitle, company, location, startDate, endDate, isCurrent, teachingMode, description } =
      req.body as Record<string, any>;

    const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { id: true } });
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const parsedStart = parseDate(startDate);
    if (!jobTitle || !company || !location || !parsedStart || !teachingMode) {
      return res
        .status(400)
        .json({ error: 'Job title, company, location, start date and teaching mode are required' });
    }

    const current = toBoolean(isCurrent);
    const data = {
      jobTitle: String(jobTitle).trim(),
      company: String(company).trim(),
      location: String(location).trim(),
      startDate: parsedStart,
      endDate: current ? null : parseDate(endDate),
      isCurrent: current,
      teachingMode: String(teachingMode).trim(),
      description: toNullableString(description),
    };

    const experience = experienceId
      ? await prisma.experience.update({ where: { id: experienceId }, data })
      : await prisma.experience.create({ data: { ...data, tutorId } });

    const profileCompletion = await calculateProfileCompletion(tutorId);

    res.json({
      message: `Experience ${experienceId ? 'updated' : 'added'} successfully`,
      experience,
      profileCompletion,
    });
  } catch (error) {
    console.error('Admin save tutor experience error:', error);
    res.status(500).json({ error: 'Error saving experience' });
  }
};

export const deleteTutorExperienceAdmin = async (req: Request, res: Response) => {
  try {
    const { tutorId, experienceId } = req.params;

    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
      select: { id: true, tutorId: true },
    });

    if (!experience || experience.tutorId !== tutorId) {
      return res.status(404).json({ error: 'Experience not found for this tutor' });
    }

    await prisma.experience.delete({ where: { id: experienceId } });
    const profileCompletion = await calculateProfileCompletion(tutorId);

    res.json({ message: 'Experience deleted successfully', profileCompletion });
  } catch (error) {
    console.error('Admin delete tutor experience error:', error);
    res.status(500).json({ error: 'Error deleting experience' });
  }
};

export const saveTutorEducationAdmin = async (req: Request, res: Response) => {
  try {
    const { tutorId, educationId } = req.params;
    const { degreeTitle, university, location, startDate, endDate, isOngoing } = req.body as Record<
      string,
      any
    >;

    const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { id: true } });
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const parsedStart = parseDate(startDate);
    if (!degreeTitle || !university || !location || !parsedStart) {
      return res
        .status(400)
        .json({ error: 'Degree title, university, location and start date are required' });
    }

    const ongoing = toBoolean(isOngoing);
    const data = {
      degreeTitle: String(degreeTitle).trim(),
      university: String(university).trim(),
      location: String(location).trim(),
      startDate: parsedStart,
      endDate: ongoing ? null : parseDate(endDate),
      isOngoing: ongoing,
    };

    const education = educationId
      ? await prisma.education.update({ where: { id: educationId }, data })
      : await prisma.education.create({ data: { ...data, tutorId } });

    const profileCompletion = await calculateProfileCompletion(tutorId);

    res.json({
      message: `Education ${educationId ? 'updated' : 'added'} successfully`,
      education,
      profileCompletion,
    });
  } catch (error) {
    console.error('Admin save tutor education error:', error);
    res.status(500).json({ error: 'Error saving education' });
  }
};

export const deleteTutorEducationAdmin = async (req: Request, res: Response) => {
  try {
    const { tutorId, educationId } = req.params;

    const education = await prisma.education.findUnique({
      where: { id: educationId },
      select: { id: true, tutorId: true },
    });

    if (!education || education.tutorId !== tutorId) {
      return res.status(404).json({ error: 'Education not found for this tutor' });
    }

    await prisma.education.delete({ where: { id: educationId } });
    const profileCompletion = await calculateProfileCompletion(tutorId);

    res.json({ message: 'Education deleted successfully', profileCompletion });
  } catch (error) {
    console.error('Admin delete tutor education error:', error);
    res.status(500).json({ error: 'Error deleting education' });
  }
};

export const saveTutorAvailabilityAdmin = async (req: Request, res: Response) => {
  try {
    const { tutorId, availabilityId } = req.params;
    const { blockTitle, daysAvailable, startTime, endTime, breakTime, sessionDuration, numberOfSlots } =
      req.body as Record<string, any>;

    const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { id: true } });
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const days = Array.isArray(daysAvailable)
      ? daysAvailable.filter((day: unknown) => typeof day === 'string' && day.trim())
      : [];

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!blockTitle || days.length === 0 || !timePattern.test(startTime) || !timePattern.test(endTime)) {
      return res.status(400).json({
        error: 'Block title, at least one day, and valid HH:MM start/end times are required',
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const data = {
      blockTitle: String(blockTitle).trim(),
      daysAvailable: JSON.stringify(days),
      startTime,
      endTime,
      breakTime: Number(breakTime) || 0,
      sessionDuration: Number(sessionDuration) || 60,
      numberOfSlots: Number(numberOfSlots) || 1,
    };

    const availability = availabilityId
      ? await prisma.availability.update({ where: { id: availabilityId }, data })
      : await prisma.availability.create({ data: { ...data, tutorId } });

    const profileCompletion = await calculateProfileCompletion(tutorId);

    res.json({
      message: `Availability ${availabilityId ? 'updated' : 'added'} successfully`,
      availability: { ...availability, daysAvailable: days },
      profileCompletion,
    });
  } catch (error) {
    console.error('Admin save tutor availability error:', error);
    res.status(500).json({ error: 'Error saving availability' });
  }
};

export const deleteTutorAvailabilityAdmin = async (req: Request, res: Response) => {
  try {
    const { tutorId, availabilityId } = req.params;

    const availability = await prisma.availability.findUnique({
      where: { id: availabilityId },
      select: { id: true, tutorId: true },
    });

    if (!availability || availability.tutorId !== tutorId) {
      return res.status(404).json({ error: 'Availability not found for this tutor' });
    }

    await prisma.availability.delete({ where: { id: availabilityId } });
    const profileCompletion = await calculateProfileCompletion(tutorId);

    res.json({ message: 'Availability deleted successfully', profileCompletion });
  } catch (error) {
    console.error('Admin delete tutor availability error:', error);
    res.status(500).json({ error: 'Error deleting availability' });
  }
};

export const updateStudentProfileAdmin = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, userId: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const data = {
      ...pick(body, 'firstName', toNullableString),
      ...pick(body, 'lastName', toNullableString),
      ...pick(body, 'gender', toNullableString),
      ...pick(body, 'grade', toNullableString),
      ...pick(body, 'tagline', toNullableString),
      ...pick(body, 'bio', toNullableString),
      ...pick(body, 'introduction', toNullableString),
      ...pick(body, 'country', toNullableString),
      ...pick(body, 'state', toNullableString),
      ...pick(body, 'city', toNullableString),
      ...pick(body, 'address', toNullableString),
      ...pick(body, 'zipcode', toNullableString),
      ...pick(body, 'timezone', toNullableString),
      ...pick(body, 'profileImage', toNullableString),
      ...pick(body, 'languagesSpoken', toStoredArray),
      ...pick(body, 'learningPreferences', toStoredArray),
    };

    const accountEmail = toNullableString(body.email);
    if (accountEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
        return res.status(400).json({ error: 'A valid email address is required' });
      }
      const taken = await prisma.user.findFirst({
        where: { email: accountEmail.toLowerCase(), NOT: { id: student.userId } },
        select: { id: true },
      });
      if (taken) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }
      await prisma.user.update({
        where: { id: student.userId },
        data: { email: accountEmail.toLowerCase() },
      });
    }

    const updated = await prisma.student.update({ where: { id: studentId }, data });

    const profileCompleted = calculateStudentProfileCompleted(updated);
    if (profileCompleted !== updated.profileCompleted) {
      await prisma.student.update({ where: { id: studentId }, data: { profileCompleted } });
    }

    res.json({
      message: 'Student profile updated successfully',
      student: { ...formatStudent(updated as any), profileCompleted },
    });
  } catch (error) {
    console.error('Admin update student profile error:', error);
    res.status(500).json({ error: 'Error updating student profile' });
  }
};
