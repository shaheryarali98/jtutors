import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../services/stripe.service';
import { confirmPayment } from '../services/payment.service';
import { completeWithdrawal } from '../services/withdrawal.service';
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

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error handling event:', error);
    res.status(500).json({ error: error.message || 'Error processing webhook' });
  }
};

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

