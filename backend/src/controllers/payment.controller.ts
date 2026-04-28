import { Request, Response } from 'express';
import { createPayment, confirmPayment, getPayment, getPaymentsByUser, calculateCommission } from '../services/payment.service';
import { createBookingCheckoutSession } from '../services/stripe.service';
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
    const amount = booking.payment?.amount
      ?? Math.max(1, Math.round(durationHours * (booking.tutor.hourlyFee || 0) * 100) / 100);
    if (amount <= 0) return res.status(400).json({ error: 'Invalid booking amount' });

    const commission = await calculateCommission(amount);
    const adminCommissionAmount = commission.adminCommissionAmount;
    const tutorAmount = commission.tutorAmount;
    const studentChargeAmount = commission.studentChargeAmount;

    // Upsert pending payment
    let payment = booking.payment;
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          booking: { connect: { id: booking.id } },
          student: { connect: { id: student.id } },
          tutor: { connect: { id: booking.tutorId } },
          amount,
          currency: 'USD',
          paymentStatus: 'PENDING',
          adminCommissionAmount,
          tutorAmount,
        },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // ── Dev bypass: skip Stripe, return local mock-checkout URL ───────────────
    if (devBypass) {
      const tutorName = `${booking.tutor.firstName ?? 'Tutor'} ${booking.tutor.lastName ?? ''}`.trim();
      return res.json({
        url: `${frontendUrl}/dev/mock-checkout?type=payment&id=${payment.id}&title=${encodeURIComponent(`Session with ${tutorName}`)}&amount=${amount}&returnUrl=${encodeURIComponent('/student/bookings?paid=1')}`,
        sessionId: 'dev_bypass',
      });
    }

    const session = await createBookingCheckoutSession({
      bookingTitle: `Tutoring session with ${booking.tutor.firstName ?? 'Tutor'} ${booking.tutor.lastName ?? ''}`.trim(),
      bookingDescription: `Booking #${booking.id.slice(0, 8)} — ${durationHours.toFixed(2)} hour(s)`,
      priceInCents: Math.round(studentChargeAmount * 100),
      platformFeeAmountCents: Math.round(commission.adminCommissionAmount * 100),
      tutorStripeAccountId: booking.tutor.stripeAccountId!,
      paymentId: payment.id,
      bookingId: booking.id,
      studentId: student.id,
      successUrl: `${frontendUrl}/student/bookings?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/student/bookings?cancelled=1`,
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Create booking checkout error:', error);
    return res.status(500).json({ error: error.message || 'Error starting checkout' });
  }
};

