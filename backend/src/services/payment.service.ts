import { PrismaClient } from '@prisma/client';
import { createPaymentIntent, confirmPaymentIntent } from './stripe.service';
import { getAdminSettings } from './settings.service';
import { sendTemplatedEmail } from './emailTemplate.service';

const prisma = new PrismaClient();

export interface CreatePaymentData {
  bookingId: string;
  studentId: string;
  tutorId: string;
  amount: number;
  currency?: string;
}

// Calculate commission based on admin settings
export const calculateCommission = async (
  amount: number
): Promise<{
  adminCommissionPercentage: number;
  adminCommissionFixed: number;
  adminCommissionAmount: number;
  tutorAmount: number;
}> => {
  const settings = await getAdminSettings();
  const percentage = settings.adminCommissionPercentage || 10.0;
  const fixed = settings.adminCommissionFixed || 0.0;

  const percentageAmount = (amount * percentage) / 100;
  const adminCommissionAmount = percentageAmount + fixed;
  const tutorAmount = amount - adminCommissionAmount;

  return {
    adminCommissionPercentage: percentage,
    adminCommissionFixed: fixed,
    adminCommissionAmount: Math.round(adminCommissionAmount * 100) / 100,
    tutorAmount: Math.round(tutorAmount * 100) / 100,
  };
};

// Create payment and payment intent
export const createPayment = async (data: CreatePaymentData) => {
  const { bookingId, studentId, tutorId, amount, currency = 'USD' } = data;

  // Calculate commission
  const commission = await calculateCommission(amount);

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      studentId,
      tutorId,
      amount,
      currency,
      adminCommissionPercentage: commission.adminCommissionPercentage,
      adminCommissionFixed: commission.adminCommissionFixed,
      adminCommissionAmount: commission.adminCommissionAmount,
      tutorAmount: commission.tutorAmount,
      paymentStatus: 'PENDING',
    },
    include: {
      student: {
        include: { user: true },
      },
      tutor: {
        include: { user: true },
      },
      booking: true,
    },
  });

  // Create Stripe payment intent
  let paymentIntent = null;
  try {
    paymentIntent = await createPaymentIntent(amount, currency.toLowerCase(), {
      paymentId: payment.id,
      bookingId,
      studentId,
      tutorId,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
  }

  // Update payment with Stripe payment intent ID
  if (paymentIntent) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    });
  }

  return {
    ...payment,
    clientSecret: paymentIntent?.client_secret,
  };
};

// Confirm payment after Stripe webhook or manual confirmation
export const confirmPayment = async (paymentId: string, stripeChargeId?: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      student: { include: { user: true } },
      tutor: { include: { user: true } },
      booking: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.paymentStatus === 'PAID') {
    return payment;
  }

  // Verify payment intent if provided
  if (payment.stripePaymentIntentId) {
    try {
      const intent = await confirmPaymentIntent(payment.stripePaymentIntentId);
      if (intent.status !== 'succeeded') {
        throw new Error(`Payment intent status: ${intent.status}`);
      }
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  // Update payment status
  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      paymentStatus: 'PAID',
      paidAt: new Date(),
      ...(stripeChargeId && { stripeChargeId }),
    },
    include: {
      student: { include: { user: true } },
      tutor: { include: { user: true } },
      booking: true,
    },
  });

  // Send payment confirmation email to student
  try {
    await sendTemplatedEmail('PAYMENT_RECEIVED', payment.student.user.email, {
      userName: payment.student.user.email,
      amount: payment.amount,
      currency: payment.currency,
      bookingId: payment.bookingId,
    });
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
  }

  return updated;
};

// Get payment by ID
export const getPayment = async (paymentId: string) => {
  return await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      student: { include: { user: true } },
      tutor: { include: { user: true } },
      booking: true,
    },
  });
};

// Get payments by user
export const getPaymentsByUser = async (userId: string, role: 'STUDENT' | 'TUTOR') => {
  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return [];

    return await prisma.payment.findMany({
      where: { studentId: student.id },
      include: {
        tutor: { include: { user: true } },
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    const tutor = await prisma.tutor.findUnique({
      where: { userId },
    });
    if (!tutor) return [];

    return await prisma.payment.findMany({
      where: { tutorId: tutor.id },
      include: {
        student: { include: { user: true } },
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
};

