import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../services/stripe.service';
import { confirmPayment } from '../services/payment.service';
import { completeWithdrawal } from '../services/withdrawal.service';
import { confirmEnrollmentPayment } from '../services/enrollment.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stripe webhook handler
export const handleStripeWebhook = async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.warn('[Stripe Webhook] Missing signature or webhook secret');
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error handling event:', error);
    res.status(500).json({ error: error.message || 'Error processing webhook' });
  }
};

// Handle completed Checkout Session (course enrollment OR booking payments)
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? '';

  // Course enrollment checkout
  if (meta.enrollmentId) {
    try {
      await confirmEnrollmentPayment(session.id, paymentIntentId, meta);
      console.log(`[Stripe Webhook] Enrollment confirmed: ${meta.enrollmentId}`);
    } catch (error: any) {
      console.error(`[Stripe Webhook] Error confirming enrollment ${meta.enrollmentId}:`, error);
      throw error;
    }
    return;
  }

  // Booking checkout — save breakdown fields from session metadata
  if (meta.extraTimeChargeId) {
    try {
      await prisma.extraTimeCharge.update({
        where: { id: meta.extraTimeChargeId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId || undefined,
        },
      });
      console.log(`[Stripe Webhook] Extra-time charge confirmed: ${meta.extraTimeChargeId}`);
    } catch (error: any) {
      console.error(`[Stripe Webhook] Error confirming extra-time charge ${meta.extraTimeChargeId}:`, error);
      throw error;
    }
    return;
  }

  // Booking checkout — save breakdown fields from session metadata
  if (meta.paymentId) {
    try {
      // Save breakdown fields on Payment record before confirming
      if (meta.basePriceCents) {
        await prisma.payment.update({
          where: { id: meta.paymentId },
          data: {
            studentFeeAmount:      meta.studentFeeCents      ? Number(meta.studentFeeCents)      / 100 : undefined,
            tutorDeductionAmount:  meta.tutorDeductionCents  ? Number(meta.tutorDeductionCents)  / 100 : undefined,
            studentChargeAmount:   meta.studentPaysCents     ? Number(meta.studentPaysCents)     / 100 : undefined,
            adminCommissionAmount: meta.platformFeeCents     ? Number(meta.platformFeeCents)     / 100 : undefined,
            tutorAmount:           meta.tutorPayoutCents     ? Number(meta.tutorPayoutCents)     / 100 : undefined,
            stripeCheckoutSessionId: session.id,
          },
        });
      }
      await confirmPayment(meta.paymentId, paymentIntentId);
      console.log(`[Stripe Webhook] Booking payment confirmed: ${meta.paymentId}`);
    } catch (error: any) {
      console.error(`[Stripe Webhook] Error confirming booking payment ${meta.paymentId}:`, error);
      throw error;
    }
    return;
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.metadata?.paymentId;

  if (!paymentId) {
    console.warn('[Stripe Webhook] Payment intent missing paymentId metadata');
    return;
  }

  try {
    await confirmPayment(paymentId, paymentIntent.id);
    console.log(`[Stripe Webhook] Payment confirmed: ${paymentId}`);
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error confirming payment ${paymentId}:`, error);
    throw error;
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.metadata?.paymentId;

  if (!paymentId) {
    console.warn('[Stripe Webhook] Payment intent missing paymentId metadata');
    return;
  }

  try {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'FAILED',
      },
    });
    console.log(`[Stripe Webhook] Payment marked as failed: ${paymentId}`);
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error updating payment ${paymentId}:`, error);
  }
}

// Handle successful payout
async function handlePayoutPaid(payout: Stripe.Payout) {
  const withdrawalId = payout.metadata?.withdrawalId;

  if (!withdrawalId) {
    console.warn('[Stripe Webhook] Payout missing withdrawalId metadata');
    return;
  }

  try {
    await completeWithdrawal(withdrawalId, payout.id);
    console.log(`[Stripe Webhook] Withdrawal completed: ${withdrawalId}`);
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error completing withdrawal ${withdrawalId}:`, error);
    throw error;
  }
}

// Handle failed payout
async function handlePayoutFailed(payout: Stripe.Payout) {
  const withdrawalId = payout.metadata?.withdrawalId;

  if (!withdrawalId) {
    console.warn('[Stripe Webhook] Payout missing withdrawalId metadata');
    return;
  }

  try {
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'FAILED',
      },
    });
    console.log(`[Stripe Webhook] Withdrawal marked as failed: ${withdrawalId}`);
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error updating withdrawal ${withdrawalId}:`, error);
  }
}

// Handle account updates (for Stripe Connect onboarding status)
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    const tutor = await prisma.tutor.findFirst({
      where: { stripeAccountId: account.id },
    });

    if (!tutor) {
      return;
    }

    const onboarded = account.charges_enabled && account.payouts_enabled;

    if (onboarded !== tutor.stripeOnboarded) {
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { stripeOnboarded: onboarded },
      });
      console.log(`[Stripe Webhook] Tutor ${tutor.id} onboarding status updated: ${onboarded}`);
    }
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error updating account ${account.id}:`, error);
  }
}

// Handle charge refunds — mark matching Payment as REFUNDED
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn('[Stripe Webhook] charge.refunded missing paymentIntentId');
    return;
  }

  try {
    const updated = await prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { paymentStatus: 'REFUNDED' },
    });
    if (updated.count > 0) {
      console.log(`[Stripe Webhook] Payment refunded for intent: ${paymentIntentId}`);
    } else {
      // May be an enrollment — mark enrollment refunded if stored
      const enrollment = await prisma.enrollment.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });
      if (enrollment) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'REFUNDED' as any },
        });
        console.log(`[Stripe Webhook] Enrollment refunded: ${enrollment.id}`);
      }
    }
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error handling refund for intent ${paymentIntentId}:`, error);
  }
}

// Handle disputes — log for admin review
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntentId = typeof dispute.payment_intent === 'string'
    ? dispute.payment_intent
    : dispute.payment_intent?.id;

  console.warn(`[Stripe Webhook] DISPUTE created — paymentIntent: ${paymentIntentId}, amount: ${dispute.amount}, reason: ${dispute.reason}`);

  if (!paymentIntentId) return;

  try {
    // Mark payment as DISPUTED so admins can see it
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { paymentStatus: 'DISPUTED' as any },
    });
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error marking dispute for intent ${paymentIntentId}:`, error);
  }
}
