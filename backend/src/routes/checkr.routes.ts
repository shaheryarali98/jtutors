import express from 'express';
import { handleCheckrWebhook, startBackgroundCheck } from '../controllers/checkr.webhook.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Start background check (auth required – creates placeholder + returns apply URL)
router.post('/start-background-check', authenticate, startBackgroundCheck);

// Checkr webhook endpoint (no auth required – Checkr sends events here)
router.post('/webhook', handleCheckrWebhook);

export default router;
