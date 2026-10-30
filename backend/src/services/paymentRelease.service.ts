import { PrismaClient } from '@prisma/client';
import { createTransfer, confirmPaymentIntent, retrieveCharge, listTransfersToAccount } from './stripe.service';
import { getPayment } from './payment.service';
import { sendTemplatedEmail } from './emailTemplate.service';

const prisma = new PrismaClient();

/**
 * Automatically release payment to tutor when class is completed
 * This transfers the tutor's portion of the payment to their Stripe Connect account
 */
export const releasePaymentToTutor = async (classSessionId: string): Promise<{
  success: boolean;
  transferId?: string;
  error?: string;
}> => {
  try {
    // Get class session with all related data
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
      return { success: false, error: 'Class session not found' };
    }

    // Check if class is completed
    if (classSession.status !== 'COMPLETED' || !classSession.tutorApproved) {
      return { success: false, error: 'Class must be completed and approved by tutor' };
    }

    // Check if payment already released
    if (classSession.paymentReleased) {
      return { success: true, error: 'Payment already released' };
    }

    // Check if payment exists and is paid
    if (!classSession.booking.payment) {
      return { success: false, error: 'Payment not found for this booking' };
    }

    const payment = classSession.booking.payment;

    if (payment.paymentStatus !== 'PAID') {
      return { success: false, error: `Payment status is ${payment.paymentStatus}, must be PAID` };
    }

    // Get tutor's Stripe Connect account ID
    const tutor = await prisma.tutor.findUnique({
      where: { id: payment.tutorId },
      include: { user: true },
    });

    if (!tutor) {
      return { success: false, error: 'Tutor not found' };
    }

    const devBypass = process.env.DEV_BYPASS_STRIPE === 'true';

    if (!devBypass && !tutor.stripeAccountId) {
      return { success: false, error: 'Tutor does not have a Stripe Connect account set up' };
    }

    // Calculate actual amount based on hours taught
    let amountToTransfer = payment.tutorAmount;

    if (classSession.actualHoursTaught && classSession.actualHoursTaught > 0) {
      // Calculate hourly rate from booking
      const booking = classSession.booking;
      const scheduledHours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
      const hourlyRate = scheduledHours > 0 ? payment.amount / scheduledHours : payment.amount;

      // Use actual hours taught if provided, otherwise use scheduled hours
      const hoursToPay = classSession.actualHoursTaught;
      const totalForHours = hourlyRate * hoursToPay;

      // Calculate tutor's portion based on commission
      const commission = await import('./payment.service').then(m =>
        m.calculateCommission(totalForHours)
      );
      amountToTransfer = commission.tutorAmount;
    }

    // Never send more than the tutor's share of what the student was actually
    // charged. Without this cap, "1.00h taught" on a 55-minute booking paid the
    // tutor more than the charge covered.
    if (payment.tutorAmount > 0) {
      amountToTransfer = Math.min(amountToTransfer, payment.tutorAmount);
    }
    amountToTransfer = Math.round(amountToTransfer * 100) / 100;

    // Create transfer to tutor's Stripe Connect account (skip in dev bypass mode)
    let transferId: string | undefined;
    if (!devBypass && tutor.stripeAccountId) {
      // Stripe only accepts a charge ID (ch_/py_) as source_transaction. Some
      // older rows hold the PaymentIntent ID instead, so resolve it to its charge.
      let sourceChargeId: string | null = null;
      const storedId = payment.stripeChargeId || payment.stripePaymentIntentId || '';
      if (storedId.startsWith('ch_') || storedId.startsWith('py_')) {
        sourceChargeId = storedId;
      } else if (storedId.startsWith('pi_')) {
        try {
          const intent = await confirmPaymentIntent(storedId);
          const latest = intent?.latest_charge;
          sourceChargeId = (typeof latest === 'string' ? latest : latest?.id) || null;
        } catch (lookupErr: any) {
          console.warn(`Could not resolve charge for ${storedId}: ${lookupErr?.message}`);
        }
      }

      // Guard 1: claim the session atomically. Two callers (cron, student
      // confirm, admin button) can never both pass this line for one session.
      const claimed = await prisma.classSession.updateMany({
        where: { id: classSessionId, paymentReleased: false },
        data: { paymentReleased: true, paymentReleasedAt: new Date() },
      });
      if (claimed.count === 0) {
        return { success: true, error: 'Payment already released' };
      }
      const unclaim = () =>
        prisma.classSession.update({
          where: { id: classSessionId },
          data: { paymentReleased: false, paymentReleasedAt: null },
        });

      // Guard 2: destination charges (all 1:1 sessions since Oct 2026, courses,
      // tips, and everything before 24 Sep 2026) already paid the tutor when
      // the student was charged. Transferring again would pay twice.
      if (sourceChargeId) {
        const charge = await retrieveCharge(sourceChargeId);
        const existing = charge?.transfer;
        const existingId = typeof existing === 'string' ? existing : existing?.id;
        if (existingId) {
          console.log(`[Release] ${classSessionId}: tutor already paid at charge time via ${existingId}; skipped duplicate transfer.`);
          return { success: true, transferId: existingId, error: 'Tutor was already paid when the student was charged' };
        }
      }

      // Guard 3: a release transfer for this session already exists in Stripe
      // (for example the DB flag was lost). Never send a second one.
      try {
        const prior = (await listTransfersToAccount(tutor.stripeAccountId)).find(
          t => t.metadata?.classSessionId === classSession.id
        );
        if (prior) {
          console.log(`[Release] ${classSessionId}: transfer ${prior.id} already exists; skipped duplicate transfer.`);
          return { success: true, transferId: prior.id, error: 'Transfer already existed' };
        }
      } catch (listErr: any) {
        console.warn(`[Release] Could not list prior transfers: ${listErr?.message}`);
      }

      try {
        const transfer = await createTransfer(
          amountToTransfer,
          tutor.stripeAccountId,
          {
            paymentId: payment.id,
            classSessionId: classSession.id,
            bookingId: classSession.bookingId,
            tutorId: tutor.id,
          },
          sourceChargeId,
          // Guard 4: Stripe-side idempotency. A retry of the same session within
          // 24h returns the original transfer instead of creating another.
          `release-${classSession.id}`
        );

        if (transfer) {
          transferId = transfer.id;
        }
      } catch (error: any) {
        console.error('Error creating Stripe transfer:', error);
        await unclaim();
        return { success: false, error: `Failed to create transfer: ${error.message}` };
      }
    } else {
      transferId = 'dev_bypass';
      console.log(`[DEV] Skipped Stripe transfer of $${amountToTransfer} to tutor ${tutor.id}`);
    }

    // Update class session to mark payment as released
    await prisma.classSession.update({
      where: { id: classSessionId },
      data: {
        paymentReleased: true,
        paymentReleasedAt: new Date(),
      },
    });

    // Send notification email to tutor
    try {
      await sendTemplatedEmail('PAYMENT_RELEASED', tutor.user.email, {
        userName: tutor.user.email,
        amount: amountToTransfer,
        currency: payment.currency,
        classSessionId: classSession.id,
        transferId: transferId || 'N/A',
      });
    } catch (error) {
      console.error('Error sending payment release email:', error);
    }

    return { success: true, transferId };
  } catch (error: any) {
    console.error('Error releasing payment to tutor:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

