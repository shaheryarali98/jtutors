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
  getJoinUrlController,
  studentConfirmSessionController,
  createSpaceForSessionController,
  createExtraTimeChargeRequestController,
} from '../controllers/classSession.controller';

const router = express.Router();

router.use(authenticate);

router.post('/', createClassSessionController);
router.post('/:id/complete', completeClassSessionController);
router.post('/:id/extra-time-request', requireRole('TUTOR'), createExtraTimeChargeRequestController);
router.post('/:id/student-confirm', requireRole('STUDENT'), studentConfirmSessionController);
router.post('/:id/approve', requireRole('ADMIN'), approveClassSessionController);
router.post('/:id/release-payment', requireRole('ADMIN'), releasePaymentController);
router.get('/my', getMyClassSessionsController);
router.get('/all', requireRole('ADMIN'), getAllClassSessionsController);
router.get('/:id/join-url', getJoinUrlController);
router.post('/:id/create-space', createSpaceForSessionController);
router.get('/:id', getClassSessionController);

export default router;

