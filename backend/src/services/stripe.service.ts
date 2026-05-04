import Stripe from 'stripe';
import { getAdminSettings } from './settings.service';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not configured. Stripe features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// ── Payment breakdown (all integer cents math, no floating-point errors) ──────
export interface PaymentBreakdown {
  basePriceCents: number;
  studentFeeCents: number;       // studentFeePercent % of base
  adminCommissionCents: number;  // platformCommissionPercent % of base (admin keeps)
  tutorDeductionCents: number;   // adminCommissionPercentage % of base (tutor-side deduction)
  studentPaysCents: number;      // base + studentFee — this is the Stripe line-item amount
  tutorPayoutCents: number;      // base - adminCommission - tutorDeduction
  platformFeeCents: number;      // studentFee + adminCommission + tutorDeduction — application_fee_amount
}

export const calculatePaymentBreakdown = async (
  basePriceCents: number
): Promise<PaymentBreakdown> => {
  const settings = await getAdminSettings();
  const studentFeePct        = settings.studentFeePercentage       ?? 4.5;
  const adminCommissionPct   = settings.platformCommissionPercent ?? 10.0;
  const tutorDeductionPct    = settings.adminCommissionPercentage   ?? 9.25;

  const studentFeeCents      = Math.round(basePriceCents * studentFeePct      / 100);
  const adminCommissionCents = Math.round(basePriceCents * adminCommissionPct / 100);
  const tutorDeductionCents  = Math.round(basePriceCents * tutorDeductionPct  / 100);
  const studentPaysCents     = basePriceCents + studentFeeCents;
  const tutorPayoutCents     = Math.max(0, basePriceCents - adminCommissionCents - tutorDeductionCents);
  const platformFeeCents     = studentFeeCents + adminCommissionCents + tutorDeductionCents;

  return {
    basePriceCents,
    studentFeeCents,
    adminCommissionCents,
    tutorDeductionCents,
    studentPaysCents,
    tutorPayoutCents,
    platformFeeCents,
  };
};

// Create payment intent for student payment
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent | null> => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
};

// Confirm payment intent
export const confirmPaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

// Create transfer to tutor's connected account
export const createTransfer = async (
  amount: number,
  destination: string, // Stripe account ID
  metadata?: Record<string, string>
): Promise<Stripe.Transfer | null> => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    destination,
    metadata,
  });
};

// Create payout for withdrawal
export const createPayout = async (
  amount: number,
  destination: string, // Stripe account ID or bank account
  metadata?: Record<string, string>
): Promise<Stripe.Payout | null> => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.payouts.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    destination,
    metadata,
  });
};

// Create connected account for tutor
export const createConnectedAccount = async (
  email: string,
  metadata?: Record<string, string>
): Promise<Stripe.Account | null> => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.accounts.create({
    type: 'express',
    email,
    metadata,
    capabilities: {
      transfers: { requested: true },
    },
  });
};

// Create account link for onboarding
export const createAccountLink = async (
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<Stripe.AccountLink | null> => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
};

// Create Stripe Checkout Session for course enrollment.
// Student pays: base price + student service fee.
// Platform application_fee = studentFee + adminCommission + tutorDeduction.
// Tutor receives: base - adminCommission - tutorDeduction (via transfer_data).
export const createEnrollmentCheckoutSession = async (options: {
  courseTitle: string;
  courseDescription: string;
  breakdown: PaymentBreakdown;           // pre-calculated by calculatePaymentBreakdown
  tutorStripeAccountId: string;
  enrollmentId: string;
  courseId: string;
  studentId: string;
  tutorId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> => {
  if (!stripe) throw new Error('Stripe is not configured');
  const { breakdown } = options;

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: options.courseTitle,
            description: options.courseDescription,
          },
          unit_amount: breakdown.studentPaysCents,   // what student pays (base + fee)
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: breakdown.platformFeeCents, // all platform fees
      transfer_data: {
        destination: options.tutorStripeAccountId,         // tutor receives the rest
      },
    },
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: {
      enrollmentId:          options.enrollmentId,
      courseId:              options.courseId,
      studentId:             options.studentId,
      tutorId:               options.tutorId,
      // breakdown (all cents) for webhook audit storage
      basePriceCents:        String(breakdown.basePriceCents),
      studentFeeCents:       String(breakdown.studentFeeCents),
      adminCommissionCents:  String(breakdown.adminCommissionCents),
      tutorDeductionCents:   String(breakdown.tutorDeductionCents),
      studentPaysCents:      String(breakdown.studentPaysCents),
      tutorPayoutCents:      String(breakdown.tutorPayoutCents),
      platformFeeCents:      String(breakdown.platformFeeCents),
    },
  });
};

// Create Stripe Checkout Session for a booking (1:1 session) payment.
// Same breakdown logic as enrollment.
export const createBookingCheckoutSession = async (options: {
  bookingTitle: string;
  bookingDescription: string;
  breakdown: PaymentBreakdown;           // pre-calculated by calculatePaymentBreakdown
  tutorStripeAccountId: string;
  paymentId: string;
  bookingId: string;
  studentId: string;
  tutorId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> => {
  if (!stripe) throw new Error('Stripe is not configured');
  const { breakdown } = options;

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: options.bookingTitle,
            description: options.bookingDescription,
          },
          unit_amount: breakdown.studentPaysCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: breakdown.platformFeeCents,
      transfer_data: {
        destination: options.tutorStripeAccountId,
      },
    },
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: {
      paymentId:             options.paymentId,
      bookingId:             options.bookingId,
      studentId:             options.studentId,
      tutorId:               options.tutorId,
      basePriceCents:        String(breakdown.basePriceCents),
      studentFeeCents:       String(breakdown.studentFeeCents),
      adminCommissionCents:  String(breakdown.adminCommissionCents),
      tutorDeductionCents:   String(breakdown.tutorDeductionCents),
      studentPaysCents:      String(breakdown.studentPaysCents),
      tutorPayoutCents:      String(breakdown.tutorPayoutCents),
      platformFeeCents:      String(breakdown.platformFeeCents),
    },
  });
};

