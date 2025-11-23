import express from 'express';
import { handleStripeWebhook } from '../controllers/stripe.webhook.controller';

const router = express.Router();

// Stripe webhook endpoint (must be before body parsing middleware)
// This route should be registered separately in server.ts with raw body parsing
router.post('/webhook', handleStripeWebhook);

export default router;

