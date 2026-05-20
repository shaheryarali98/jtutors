import { Request, Response } from 'express';
import {
  createClassSession,
  completeClassSession,
  approveClassSession,
  getClassSession,
  getClassSessionsByUser,
  getAllClassSessions,
  studentConfirmSession,
} from '../services/classSession.service';
import { createOrGetPencilUser, getPencilJoinUrl } from '../services/pencilSpaces.service';
import { PrismaClient } from '@prisma/client';
import { calculatePaymentBreakdown } from '../services/stripe.service';

const prisma = new PrismaClient();

export const createClassSessionController = async (req: Request, res: Response) => {
  try {
    const { bookingId, className } = req.body;

    const classSession = await createClassSession({ bookingId, className });

    res.json({ classSession, message: 'Class session created successfully' });
  } catch (error: any) {
    console.error('Create class session error:', error);
    res.status(500).json({ error: error.message || 'Error creating class session' });
  }
};

export const completeClassSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, actualHoursTaught } = req.body;
    const userId = req.user!.userId;

    // Get tutor profile
    const tutor = await prisma.tutor.findUnique({
      where: { userId },
    });

    if (!tutor) {
      return res.status(403).json({ error: 'Tutor profile not found' });
    }

    const classSession = await completeClassSession(id, tutor.id, notes, actualHoursTaught);

    res.json({ 
      classSession, 
      message: 'Session marked complete. Your student will be asked to confirm. Payment auto-releases in 24 hours if no response.' 
    });
  } catch (error: any) {
    console.error('Complete class session error:', error);
    res.status(500).json({ error: error.message || 'Error completing class session' });
  }
};

export const createExtraTimeChargeRequestController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actualHoursFromBody = Number(req.body?.actualHoursTaught);
    const userId = req.user!.userId;

    const tutor = await prisma.tutor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutor) {
      return res.status(403).json({ error: 'Tutor profile not found' });
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id },
      include: {
        extraTimeCharge: true,
        booking: {
          include: {
            tutor: {
              select: {
                hourlyFee: true,
              },
            },
            payment: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!classSession) {
      return res.status(404).json({ error: 'Class session not found' });
    }

    if (classSession.booking.tutorId !== tutor.id) {
      return res.status(403).json({ error: 'Only the assigned tutor can request extra payment' });
    }

    if (classSession.status !== 'COMPLETED' || !classSession.tutorApproved) {
      return res.status(400).json({ error: 'Session must be marked completed before requesting extra payment' });
    }

    if (classSession.extraTimeCharge && classSession.extraTimeCharge.status !== 'CANCELLED' && classSession.extraTimeCharge.status !== 'EXPIRED') {
      return res.status(400).json({ error: 'An extra-time request already exists for this session' });
    }

    const scheduledHoursRaw = (classSession.booking.endTime.getTime() - classSession.booking.startTime.getTime()) / (1000 * 60 * 60);
    const scheduledHours = Math.max(0.25, Number(scheduledHoursRaw.toFixed(2)));

    const actualHours = Number.isFinite(actualHoursFromBody) && actualHoursFromBody > 0
      ? Number(actualHoursFromBody.toFixed(2))
      : Number((classSession.actualHoursTaught || 0).toFixed(2));

    if (!actualHours || actualHours <= 0) {
      return res.status(400).json({ error: 'actualHoursTaught is required and must be greater than 0' });
    }

    const extraHoursRaw = actualHours - scheduledHours;
    if (extraHoursRaw <= 0) {
      return res.status(400).json({ error: 'No overage found. Extra payment is only available when actual time exceeds scheduled time.' });
    }

    const extraHours = Number(extraHoursRaw.toFixed(2));
    const paymentAmount = classSession.booking.payment?.amount || 0;
    const fallbackRate = classSession.booking.tutor.hourlyFee || 0;
    const hourlyRate = paymentAmount > 0
      ? paymentAmount / scheduledHours
      : fallbackRate;

    if (hourlyRate <= 0) {
      return res.status(400).json({ error: 'Unable to calculate hourly rate for extra-time payment' });
    }

    const baseAmount = Number((hourlyRate * extraHours).toFixed(2));
    const breakdown = await calculatePaymentBreakdown(Math.round(baseAmount * 100));

    const request = classSession.extraTimeCharge
      ? await prisma.extraTimeCharge.update({
          where: { id: classSession.extraTimeCharge.id },
          data: {
            scheduledHours,
            actualHours,
            extraHours,
            baseAmount,
            studentFeeAmount: breakdown.studentFeeCents / 100,
            adminCommissionAmount: breakdown.adminCommissionCents / 100,
            tutorAmount: breakdown.tutorPayoutCents / 100,
            studentChargeAmount: breakdown.studentPaysCents / 100,
            status: 'PENDING',
            paidAt: null,
            stripeCheckoutSessionId: null,
            stripePaymentIntentId: null,
            stripeChargeId: null,
          },
        })
      : await prisma.extraTimeCharge.create({
          data: {
            bookingId: classSession.bookingId,
            classSessionId: classSession.id,
            studentId: classSession.booking.studentId,
            tutorId: classSession.booking.tutorId,
            scheduledHours,
            actualHours,
            extraHours,
            baseAmount,
            studentFeeAmount: breakdown.studentFeeCents / 100,
            adminCommissionAmount: breakdown.adminCommissionCents / 100,
            tutorAmount: breakdown.tutorPayoutCents / 100,
            studentChargeAmount: breakdown.studentPaysCents / 100,
            status: 'PENDING',
          },
        });

    await prisma.classSession.update({
      where: { id: classSession.id },
      data: { actualHoursTaught: actualHours },
    });

    return res.status(201).json({
      message: 'Extra-time payment request sent to your student.',
      extraTimeCharge: request,
    });
  } catch (error: any) {
    console.error('Create extra-time request error:', error);
    return res.status(500).json({ error: error.message || 'Error creating extra-time payment request' });
  }
};

export const studentConfirmSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    const classSession = await studentConfirmSession(id, student.id);
    res.json({
      classSession,
      message: 'Session confirmed. Payment has been released to your tutor.',
    });
  } catch (error: any) {
    console.error('Student confirm session error:', error);
    res.status(400).json({ error: error.message || 'Error confirming session' });
  }
};

export const approveClassSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user!.userId;

    const classSession = await approveClassSession(id, adminId, notes);

    res.json({ classSession, message: 'Class session approved successfully' });
  } catch (error: any) {
    console.error('Approve class session error:', error);
    res.status(500).json({ error: error.message || 'Error approving class session' });
  }
};

export const getClassSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const classSession = await getClassSession(id);

    if (!classSession) {
      return res.status(404).json({ error: 'Class session not found' });
    }

    res.json({ classSession });
  } catch (error: any) {
    console.error('Get class session error:', error);
    res.status(500).json({ error: error.message || 'Error fetching class session' });
  }
};

export const getMyClassSessionsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role as 'STUDENT' | 'TUTOR';

    if (userRole !== 'STUDENT' && userRole !== 'TUTOR') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const classSessions = await getClassSessionsByUser(userId, userRole);

    res.json({ classSessions });
  } catch (error: any) {
    console.error('Get my class sessions error:', error);
    res.status(500).json({ error: error.message || 'Error fetching class sessions' });
  }
};

export const getAllClassSessionsController = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const classSessions = await getAllClassSessions(status as string | undefined);

    res.json({ classSessions });
  } catch (error: any) {
    console.error('Get all class sessions error:', error);
    res.status(500).json({ error: error.message || 'Error fetching class sessions' });
  }
};

export const releasePaymentController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { releasePaymentToTutor } = await import('../services/paymentRelease.service');
    const result = await releasePaymentToTutor(id);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to release payment' });
    }

    res.json({ 
      message: 'Payment released successfully', 
      transferId: result.transferId 
    });
  } catch (error: any) {
    console.error('Release payment error:', error);
    res.status(500).json({ error: error.message || 'Error releasing payment' });
  }
};

export const getJoinUrlController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const classSession = await prisma.classSession.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            student: { include: { user: true } },
            tutor: { include: { user: true } },
          },
        },
      },
    });

    if (!classSession) {
      return res.status(404).json({ error: 'Class session not found' });
    }

    if (!classSession.pencilSpaceUrl) {
      return res.status(404).json({ error: 'No Pencil Space has been created for this session yet' });
    }

    // Determine which user is requesting
    const isStudent = userRole === 'STUDENT' && classSession.booking.student.userId === userId;
    const isTutor = userRole === 'TUTOR' && classSession.booking.tutor.userId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isStudent && !isTutor && !isAdmin) {
      return res.status(403).json({ error: 'You are not a participant of this session' });
    }

    // Resolve the requesting user's email/name for Pencil Spaces
    let email: string;
    let firstName: string;
    let lastName: string;

    if (isStudent) {
      email = classSession.booking.student.user.email;
      firstName = classSession.booking.student.firstName || '';
      lastName = classSession.booking.student.lastName || '';
    } else if (isTutor) {
      email = classSession.booking.tutor.user.email;
      firstName = classSession.booking.tutor.firstName || '';
      lastName = classSession.booking.tutor.lastName || '';
    } else {
      // Admin — use tutor side as default observer
      email = classSession.booking.tutor.user.email;
      firstName = classSession.booking.tutor.firstName || '';
      lastName = classSession.booking.tutor.lastName || '';
    }

    const userRoleForPencil = isStudent ? 'student' : 'teacher';
    const pencilUser = await createOrGetPencilUser(email, firstName, lastName, userRoleForPencil as 'student' | 'teacher');
    const joinUrl = await getPencilJoinUrl(pencilUser.id, classSession.pencilSpaceUrl);

    res.json({ joinUrl });
  } catch (error: any) {
    console.error('Get join URL error:', error);
    res.status(500).json({ error: error.message || 'Error generating join URL' });
  }
};

// POST /class-sessions/:id/create-space — retroactively create a Pencil Space for a session
export const createSpaceForSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const classSession = await prisma.classSession.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            student: { include: { user: true } },
            tutor: { include: { user: true } },
          },
        },
      },
    });

    if (!classSession) return res.status(404).json({ error: 'Class session not found' });

    const isTutor = userRole === 'TUTOR' && classSession.booking.tutor.userId === userId;
    const isAdmin = userRole === 'ADMIN';
    if (!isTutor && !isAdmin) return res.status(403).json({ error: 'Not authorised' });

    if (classSession.pencilSpaceUrl) {
      return res.json({ pencilSpaceUrl: classSession.pencilSpaceUrl, message: 'Space already exists' });
    }

    const { createPencilSpace, createOrGetPencilUser: regUser } = await import('../services/pencilSpaces.service');
    const booking = classSession.booking;
    const spaceName = `Session: ${booking.tutor.user.email} & ${booking.student.user.email}`;
    const space = await createPencilSpace(spaceName);

    await Promise.allSettled([
      regUser(booking.tutor.user.email, booking.tutor.firstName || '', booking.tutor.lastName || '', 'teacher'),
      regUser(booking.student.user.email, booking.student.firstName || '', booking.student.lastName || '', 'student'),
    ]);

    const updated = await prisma.classSession.update({
      where: { id },
      data: { pencilSpaceId: space.id, pencilSpaceUrl: space.url },
    });

    res.json({ pencilSpaceUrl: updated.pencilSpaceUrl, message: 'Pencil Space created' });
  } catch (error: any) {
    console.error('Create space for session error:', error);
    res.status(500).json({ error: error.message || 'Error creating Pencil Space' });
  }
};

