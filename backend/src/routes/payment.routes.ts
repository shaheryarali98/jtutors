import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  createPaymentController,
  confirmPaymentController,
  getPaymentController,
  getMyPaymentsController,
  createBookingCheckoutController,
  getPendingExtraTimeChargesController,
  createExtraTimeCheckoutController,
} from '../controllers/payment.controller';

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('STUDENT'), createPaymentController);
router.post('/checkout', requireRole('STUDENT'), createBookingCheckoutController);
router.get('/extra-time/pending', requireRole('STUDENT'), getPendingExtraTimeChargesController);
router.post('/extra-time/:id/checkout', requireRole('STUDENT'), createExtraTimeCheckoutController);
router.post('/:id/confirm', requireRole('STUDENT', 'ADMIN'), confirmPaymentController);
router.get('/my', requireRole('STUDENT', 'TUTOR'), getMyPaymentsController);
router.get('/:id', requireRole('STUDENT', 'TUTOR'), getPaymentController);

export default router;

