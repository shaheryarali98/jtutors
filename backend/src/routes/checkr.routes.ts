import express from 'express';
import { handleCheckrWebhook } from '../controllers/checkr.webhook.controller';

const router = express.Router();

// Checkr webhook endpoint (no auth required – Checkr sends events here)
router.post('/webhook', handleCheckrWebhook);

export default router;
