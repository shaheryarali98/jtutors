import { PrismaClient } from '@prisma/client';
import { calculatePaymentBreakdown, stripe } from './stripe.service';

const prisma = new PrismaClient();

const FIRST_SESSION_COUPONS = new Map([
  ['jtutorsfivetowns', 'JTutorsFiveTowns'],
  ['jtutorssar', 'JTutorsSAR'],
  ['jtutorshillel', 'JTutorsHillel'],
  ['jtutorslakewood', 'JTutorsLakewood'],
  ['jtutorsyeshivatnoam', 'JtutorsYeshivatNoam'],
]);

export const getBookingCoupon = (couponCode?: string | null) => {
  const normalizedCode = couponCode?.trim().toLowerCase() || '';
  const canonicalCode = FIRST_SESSION_COUPONS.get(normalizedCode);
  if (canonicalCode) {
    return { canonicalCode, discountPercent: 50, discountAmount: 0, firstSessionOnly: true };
  }
  if (normalizedCode === 'rachel') {
    return { canonicalCode: 'rachel', discountPercent: 0, discountAmount: 10, firstSessionOnly: false };
  }
  return null;
};

export const hasPaidTutoringSession = async (studentId: string) => {
  const payment = await prisma.payment.findFirst({
    where: { studentId, paymentStatus: 'PAID' },
    select: { id: true },
  });
  return Boolean(payment);
};

/**
 * Price a booking, applying any coupon attached to it.
 * Shared by the automatic charge and the manual "Pay now" fallback so the two
 * can never disagree about the amount.
 */
export const priceBooking = async (
  booking: { startTime: Date; endTime: Date; tutor: { hourlyFee: number | null } },
  couponCode: string | null | undefined,
  studentId: string
) => {
  const durationHours = Math.max(
    0.25,
    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60)
  );
  const undiscountedBasePriceDollars = Math.max(
    1,
    Math.round(durationHours * (booking.tutor.hourlyFee || 0) * 100) / 100
  );

  const coupon = getBookingCoupon(couponCode);
  // A first-session coupon quietly lapses once the student has paid for a
  // session, rather than blocking the charge outright.
  const couponApplies =
    coupon !== null && (!coupon.firstSessionOnly || !(await hasPaidTutoringSession(studentId)));

  const couponDiscountPercent = couponApplies && coupon ? coupon.discountPercent : 0;
  const couponDiscountAmount = couponApplies && coupon ? coupon.discountAmount : 0;

  const basePriceDollars = Math.max(
    0.5,
    Math.round(
      (undiscountedBasePriceDollars * (1 - couponDiscountPercent / 100) - couponDiscountAmount) * 100
    ) / 100
  );

  const breakdown = await calculatePaymentBreakdown(Math.round(basePriceDollars * 100));

  return {
    basePriceDollars,
    undiscountedBasePriceDollars,
    couponCode: couponApplies && coupon ? coupon.canonicalCode : null,
    couponDiscountPercent,
    couponDiscountAmount,
    breakdown,
  };
};

export type BookingChargeResult =
  | { status: 'PAID'; paymentIntentId: string }
  | { status: 'SKIPPED'; reason: string }
  | { status: 'FAILED'; reason: string; requiresAction: boolean };

/**
 * Charge the card the student saved when they booked.
 *
 * Called when the tutor accepts. Nothing was charged at booking time — the card
 * was only stored — so this is the point money actually moves. A failure here
 * never blocks the confirmation: the booking stays CONFIRMED and the student
 * still has the normal "Pay now" button as a fallback.
 */
export const chargeBookingOnConfirmation = async (
  bookingId: string
): Promise<BookingChargeResult> => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      student: true,
      tutor: {
        select: { id: true, hourlyFee: true, stripeAccountId: true, stripeOnboarded: true },
      },
    },
  });

  if (!booking) return { status: 'SKIPPED', reason: 'Booking not found' };
  if (booking.payment?.paymentStatus === 'PAID') {
    return { status: 'SKIPPED', reason: 'Already paid' };
  }
  if (!stripe) return { status: 'SKIPPED', reason: 'Stripe is not configured' };
  if (!booking.stripePaymentMethodId) {
    return { status: 'SKIPPED', reason: 'No card was saved for this booking' };
  }

  const customerId = (booking.student as any).stripeCustomerId as string | null;
  if (!customerId) return { status: 'SKIPPED', reason: 'Student has no Stripe customer' };

  if (!booking.tutor.stripeAccountId || !booking.tutor.stripeOnboarded) {
    return { status: 'SKIPPED', reason: 'Tutor has not completed Stripe onboarding' };
  }

  const priced = await priceBooking(booking, booking.couponCode, booking.studentId);
  const bd = priced.breakdown;

  const paymentData = {
    amount: priced.basePriceDollars,
    currency: 'USD',
    adminCommissionAmount: bd.platformFeeCents / 100,
    tutorAmount: bd.tutorPayoutCents / 100,
    studentFeeAmount: bd.studentFeeCents / 100,
    tutorDeductionAmount: bd.tutorDeductionCents / 100,
    studentChargeAmount: bd.studentPaysCents / 100,
    couponCode: priced.couponCode,
    couponDiscountPercent: priced.couponDiscountPercent,
    couponDiscountAmount: priced.couponDiscountAmount,
  };

  const payment = booking.payment
    ? await prisma.payment.update({
        where: { id: booking.payment.id },
        data: { ...paymentData, paymentStatus: 'PENDING' },
      })
    : await prisma.payment.create({
        data: {
          booking: { connect: { id: booking.id } },
          student: { connect: { id: booking.studentId } },
          tutor: { connect: { id: booking.tutorId } },
          ...paymentData,
          paymentStatus: 'PENDING',
        },
      });

  try {
    const intent = await stripe.paymentIntents.create({
      amount: bd.studentPaysCents,
      currency: 'usd',
      customer: customerId,
      payment_method: booking.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      application_fee_amount: bd.platformFeeCents,
      transfer_data: { destination: booking.tutor.stripeAccountId },
      metadata: {
        paymentId: payment.id,
        bookingId: booking.id,
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        chargedOn: 'tutor_confirmation',
      },
    });

    if (intent.status === 'succeeded') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
          stripePaymentIntentId: intent.id,
          stripeChargeId: (intent.latest_charge as string) || null,
        },
      });
      return { status: 'PAID', paymentIntentId: intent.id };
    }

    // Anything else (typically requires_action) needs the student present.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentStatus: 'FAILED', stripePaymentIntentId: intent.id },
    });
    return {
      status: 'FAILED',
      reason: `Payment needs confirmation from the student (${intent.status})`,
      requiresAction: true,
    };
  } catch (error: any) {
    // Declines and authentication_required both land here.
    const requiresAction = error?.code === 'authentication_required';
    console.error(`Off-session charge failed for booking ${booking.id}:`, error?.message || error);

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: 'FAILED',
        stripePaymentIntentId: error?.raw?.payment_intent?.id || null,
      },
    });

    return {
      status: 'FAILED',
      reason: error?.message || 'The card was declined',
      requiresAction,
    };
  }
};
