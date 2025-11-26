import { PrismaClient } from '@prisma/client';
import { createTransfer } from './stripe.service';
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

    if (!tutor || !tutor.stripeAccountId) {
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

    // Create transfer to tutor's Stripe Connect account
    let transferId: string | undefined;
    try {
      const transfer = await createTransfer(
        amountToTransfer,
        tutor.stripeAccountId,
        {
          paymentId: payment.id,
          classSessionId: classSession.id,
          bookingId: classSession.bookingId,
          tutorId: tutor.id,
        }
      );

      if (transfer) {
        transferId = transfer.id;
      }
    } catch (error: any) {
      console.error('Error creating Stripe transfer:', error);
      return { success: false, error: `Failed to create transfer: ${error.message}` };
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

