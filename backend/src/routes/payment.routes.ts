import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createPaymentController,
  confirmPaymentController,
  getPaymentController,
  getMyPaymentsController,
} from '../controllers/payment.controller';

const router = express.Router();

router.use(authenticate);

router.post('/', createPaymentController);
router.post('/:id/confirm', confirmPaymentController);
router.get('/my', getMyPaymentsController);
router.get('/:id', getPaymentController);

export default router;

