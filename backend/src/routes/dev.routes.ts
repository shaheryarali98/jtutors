/**
 * DEV-ONLY routes — only registered when NODE_ENV !== 'production' AND DEV_BYPASS_STRIPE=true.
 * These endpoints confirm enrollments and payments directly without Stripe.
 */
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { confirmEnrollmentPayment } from '../services/enrollment.service';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/dev/confirm-enrollment  { enrollmentId }
// Marks enrollment PAID instantly (simulates a successful Stripe webhook)
router.post('/confirm-enrollment', async (req: Request, res: Response) => {
  const { enrollmentId } = req.body as { enrollmentId: string };
  if (!enrollmentId) return res.status(400).json({ error: 'enrollmentId is required' });

  try {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    if (enrollment.status === 'PAID') return res.json({ ok: true, already: true });

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'PAID',
        stripePaymentIntentId: 'dev_bypass',
        paidAt: new Date(),
      },
    });

    return res.json({ ok: true, enrollment: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/dev/confirm-payment  { paymentId }
// Marks booking payment PAID instantly
router.post('/confirm-payment', async (req: Request, res: Response) => {
  const { paymentId } = req.body as { paymentId: string };
  if (!paymentId) return res.status(400).json({ error: 'paymentId is required' });

  try {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.paymentStatus === 'PAID') return res.json({ ok: true, already: true });

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'PAID',
        stripePaymentIntentId: 'dev_bypass',
        paidAt: new Date(),
      },
    });

    // Confirm the booking when payment succeeds
    if (updated.bookingId) {
      await prisma.booking.update({
        where: { id: updated.bookingId },
        data: { status: 'CONFIRMED' },
      });
    }

    return res.json({ ok: true, payment: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
