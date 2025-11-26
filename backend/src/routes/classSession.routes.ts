import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  createClassSessionController,
  completeClassSessionController,
  approveClassSessionController,
  getClassSessionController,
  getMyClassSessionsController,
  getAllClassSessionsController,
  releasePaymentController,
} from '../controllers/classSession.controller';

const router = express.Router();

router.use(authenticate);

router.post('/', createClassSessionController);
router.post('/:id/complete', completeClassSessionController);
router.post('/:id/approve', requireRole('ADMIN'), approveClassSessionController);
router.post('/:id/release-payment', requireRole('ADMIN'), releasePaymentController);
router.get('/my', getMyClassSessionsController);
router.get('/all', requireRole('ADMIN'), getAllClassSessionsController);
router.get('/:id', getClassSessionController);

export default router;

