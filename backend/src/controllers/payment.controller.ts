import { Request, Response } from 'express';
import { createPayment, confirmPayment, getPayment, getPaymentsByUser, calculateCommission } from '../services/payment.service';
import { createBookingCheckoutSession, createExtraTimeCheckoutSession, calculatePaymentBreakdown, PaymentBreakdown } from '../services/stripe.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createPaymentController = async (req: Request, res: Response) => {
  try {
    const { bookingId, amount, currency } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (currentUser.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Only students can create payments' });
    }

    // Get user's student profile
    const student = await prisma.student.findUnique({
      where: { userId: currentUser.userId },
    });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    // Get booking to verify tutor
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.studentId !== student.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payment = await createPayment({
      bookingId,
      studentId: student.id,
      tutorId: booking.tutorId,
      amount,
      currency,
    });

    res.json({ payment });
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: error.message || 'Error creating payment' });
  }
};

export const confirmPaymentController = async (req: Request, res: Response) => {
  try {
    const { paymentId, stripeChargeId } = req.body;

    const payment = await confirmPayment(paymentId, stripeChargeId);

    res.json({ payment, message: 'Payment confirmed successfully' });
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: error.message || 'Error confirming payment' });
  }
};

export const getPaymentController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await getPayment(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify access
    if (currentUser.role !== 'ADMIN') {
      const student = await prisma.student.findUnique({ where: { userId: currentUser.userId } });
      const tutor = await prisma.tutor.findUnique({ where: { userId: currentUser.userId } });

      if (
        (student && payment.studentId !== student.id) ||
        (tutor && payment.tutorId !== tutor.id)
      ) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    res.json({ payment });
  } catch (error: any) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: error.message || 'Error fetching payment' });
  }
};

export const getMyPaymentsController = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = currentUser.role as 'STUDENT' | 'TUTOR' | 'ADMIN';

    if (userRole !== 'STUDENT' && userRole !== 'TUTOR') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payments = await getPaymentsByUser(currentUser.userId, userRole);

    res.json({ payments });
  } catch (error: any) {
    console.error('Get my payments error:', error);
    res.status(500).json({ error: error.message || 'Error fetching payments' });
  }
};

// Create Stripe Checkout Session for a booking payment (90/10 Connect split)
export const createBookingCheckoutController = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body as { bookingId: string };
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ error: 'Authentication required' });
    if (currentUser.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can pay' });
    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });

    const student = await prisma.student.findUnique({ where: { userId: currentUser.userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: { select: { id: true, firstName: true, lastName: true, hourlyFee: true, stripeAccountId: true, stripeOnboarded: true } },
        payment: true,
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.studentId !== student.id) return res.status(403).json({ error: 'Unauthorized' });
    if (booking.payment?.paymentStatus === 'PAID') return res.status(400).json({ error: 'Already paid' });

    const devBypass = process.env.DEV_BYPASS_STRIPE === 'true';
    if (!devBypass && (!booking.tutor.stripeAccountId || !booking.tutor.stripeOnboarded)) {
      return res.status(400).json({ error: 'Tutor has not completed Stripe onboarding' });
    }

    const durationHours = Math.max(
      0.25,
      (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60)
    );
    const basePriceDollars = booking.payment?.amount
      ?? Math.max(1, Math.round(durationHours * (booking.tutor.hourlyFee || 0) * 100) / 100);
    if (basePriceDollars <= 0) return res.status(400).json({ error: 'Invalid booking amount' });

    // Calculate full 3-tier breakdown in cents
    const basePriceCents = Math.round(basePriceDollars * 100);
    const bd = await calculatePaymentBreakdown(basePriceCents);

    // Upsert pending payment — store studentChargeAmount as the amount, with full breakdown
    let payment = booking.payment;
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          booking:  { connect: { id: booking.id } },
          student:  { connect: { id: student.id } },
          tutor:    { connect: { id: booking.tutorId } },
          amount:                basePriceDollars,           // base price
          currency:              'USD',
          paymentStatus:         'PENDING',
          adminCommissionAmount: bd.platformFeeCents / 100,  // total platform gross
          tutorAmount:           bd.tutorPayoutCents / 100,
          studentFeeAmount:      bd.studentFeeCents  / 100,
          tutorDeductionAmount:  bd.tutorDeductionCents / 100,
          studentChargeAmount:   bd.studentPaysCents / 100,
        },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // ── Dev bypass: skip Stripe, return local mock-checkout URL ───────────────
    if (devBypass) {
      const tutorName = `${booking.tutor.firstName ?? 'Tutor'} ${booking.tutor.lastName ?? ''}`.trim();
      return res.json({
        url: `${frontendUrl}/dev/mock-checkout?type=payment&id=${payment.id}&title=${encodeURIComponent(`Session with ${tutorName}`)}&amount=${bd.studentPaysCents / 100}&returnUrl=${encodeURIComponent('/student/bookings?paid=1')}`,
        sessionId: 'dev_bypass',
        breakdown: {
          basePriceDollars,
          studentFeeDollars:      bd.studentFeeCents / 100,
          adminCommissionDollars: bd.adminCommissionCents / 100,
          tutorDeductionDollars:  bd.tutorDeductionCents / 100,
          totalDueDollars:        bd.studentPaysCents / 100,
          tutorPayoutDollars:     bd.tutorPayoutCents / 100,
        },
      });
    }

    const session = await createBookingCheckoutSession({
      bookingTitle: `Tutoring session with ${booking.tutor.firstName ?? 'Tutor'} ${booking.tutor.lastName ?? ''}`.trim(),
      bookingDescription: `Booking #${booking.id.slice(0, 8)} — ${durationHours.toFixed(2)} hour(s)`,
      breakdown: bd,
      tutorStripeAccountId: booking.tutor.stripeAccountId!,
      paymentId: payment.id,
      bookingId: booking.id,
      studentId: student.id,
      tutorId: booking.tutorId,
      successUrl: `${frontendUrl}/student/bookings?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/student/bookings?cancelled=1`,
    });

    // Save the checkout session ID on the payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return res.json({
      url: session.url,
      sessionId: session.id,
      breakdown: {
        basePriceDollars,
        studentFeeDollars:      bd.studentFeeCents / 100,
        adminCommissionDollars: bd.adminCommissionCents / 100,
        tutorDeductionDollars:  bd.tutorDeductionCents / 100,
        totalDueDollars:        bd.studentPaysCents / 100,
        tutorPayoutDollars:     bd.tutorPayoutCents / 100,
      },
    });
  } catch (error: any) {
    console.error('Create booking checkout error:', error);
    return res.status(500).json({ error: error.message || 'Error starting checkout' });
  }
};

export const getPendingExtraTimeChargesController = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ error: 'Authentication required' });
    if (currentUser.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can view extra-time requests' });

    const student = await prisma.student.findUnique({ where: { userId: currentUser.userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const charges = await prisma.extraTimeCharge.findMany({
      where: {
        studentId: student.id,
        status: 'PENDING',
      },
      include: {
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        booking: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return res.json({ extraTimeCharges: charges });
  } catch (error: any) {
    console.error('Get pending extra-time charges error:', error);
    return res.status(500).json({ error: error.message || 'Error fetching pending extra-time charges' });
  }
};

export const createExtraTimeCheckoutController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestedAmount = Number(req.body?.amount);
    const currentUser = req.user;

    if (!currentUser) return res.status(401).json({ error: 'Authentication required' });
    if (currentUser.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can pay extra-time requests' });

    const student = await prisma.student.findUnique({ where: { userId: currentUser.userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const charge = await prisma.extraTimeCharge.findUnique({
      where: { id },
      include: {
        tutor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            stripeAccountId: true,
            stripeOnboarded: true,
          },
        },
      },
    });

    if (!charge) return res.status(404).json({ error: 'Extra-time request not found' });
    if (charge.studentId !== student.id) return res.status(403).json({ error: 'Unauthorized' });
    if (charge.status === 'PAID') return res.status(400).json({ error: 'Extra-time request is already paid' });
    if (charge.status !== 'PENDING') return res.status(400).json({ error: `Extra-time request is ${charge.status}` });

    const devBypass = process.env.DEV_BYPASS_STRIPE === 'true';
    if (!devBypass && (!charge.tutor.stripeAccountId || !charge.tutor.stripeOnboarded)) {
      return res.status(400).json({ error: 'Tutor has not completed Stripe onboarding' });
    }

    const hasCustomAmount = req.body?.amount !== undefined && req.body?.amount !== null && String(req.body?.amount).trim() !== '';
    if (hasCustomAmount && (!Number.isFinite(requestedAmount) || requestedAmount <= 0)) {
      return res.status(400).json({ error: 'Amount must be a valid number greater than 0' });
    }

    const studentPaysCents = Math.round((hasCustomAmount ? requestedAmount : charge.studentChargeAmount) * 100);
    const existingPlatformAmount = charge.studentFeeAmount + charge.adminCommissionAmount;
    const platformRatioRaw = charge.studentChargeAmount > 0 ? existingPlatformAmount / charge.studentChargeAmount : 0;
    const platformRatio = Math.max(0, Math.min(platformRatioRaw, 1));
    const studentFeeRatioRaw = existingPlatformAmount > 0 ? charge.studentFeeAmount / existingPlatformAmount : 0.5;
    const studentFeeRatio = Math.max(0, Math.min(studentFeeRatioRaw, 1));

    const platformFeeCents = Math.max(0, Math.min(studentPaysCents, Math.round(studentPaysCents * platformRatio)));
    const studentFeeCents = Math.max(0, Math.min(platformFeeCents, Math.round(platformFeeCents * studentFeeRatio)));
    const adminCommissionCents = Math.max(0, platformFeeCents - studentFeeCents);
    const tutorPayoutCents = Math.max(0, studentPaysCents - platformFeeCents);

    const recalculatedCharge = await prisma.extraTimeCharge.update({
      where: { id: charge.id },
      data: {
        studentChargeAmount: studentPaysCents / 100,
        studentFeeAmount: studentFeeCents / 100,
        adminCommissionAmount: adminCommissionCents / 100,
        tutorAmount: tutorPayoutCents / 100,
      },
    });

    const breakdown: PaymentBreakdown = {
      basePriceCents: studentPaysCents,
      studentFeeCents,
      adminCommissionCents,
      tutorDeductionCents: 0,
      studentPaysCents,
      tutorPayoutCents,
      platformFeeCents,
    };

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (devBypass) {
      return res.json({
        url: `${frontendUrl}/dev/mock-checkout?type=extra-time&id=${charge.id}&title=${encodeURIComponent('Extra time payment')}&amount=${recalculatedCharge.studentChargeAmount.toFixed(2)}&returnUrl=${encodeURIComponent('/student/bookings?extra_paid=1')}`,
        sessionId: 'dev_bypass',
      });
    }

    const session = await createExtraTimeCheckoutSession({
      title: `Extra time with ${charge.tutor.firstName || 'Tutor'} ${charge.tutor.lastName || ''}`.trim(),
      description: `Additional ${charge.extraHours.toFixed(2)} hour(s) for booking #${charge.bookingId.slice(0, 8)}`,
      breakdown,
      tutorStripeAccountId: charge.tutor.stripeAccountId!,
      extraTimeChargeId: charge.id,
      bookingId: charge.bookingId,
      classSessionId: charge.classSessionId,
      studentId: charge.studentId,
      tutorId: charge.tutorId,
      successUrl: `${frontendUrl}/student/bookings?extra_paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/student/bookings?cancelled=1`,
    });

    await prisma.extraTimeCharge.update({
      where: { id: charge.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Create extra-time checkout error:', error);
    return res.status(500).json({ error: error.message || 'Error starting extra-time checkout' });
  }
};

