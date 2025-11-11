import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not configured. Stripe features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

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

